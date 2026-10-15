const fs = require('fs');
const path = require('path');
const Subject = require('../models/Subject');
const Note = require('../models/Note');
const Notification = require('../models/Notification');
const Timetable = require('../models/Timetable');
const Result = require('../models/Result');
const User = require('../models/User');
const { cache } = require('../utils/cache');

exports.getDashboard = async (req, res) => {
    try {
        const teacherId = req.session.user.id;
        const subjects = await Subject.find({ teacher: teacherId }).sort({ code: 1 });
        const subjectIds = subjects.map(s => s._id);

        // Fetch doubts for this teacher's subjects ONLY
        const notifications = await Notification.find({
            subject: { $in: subjectIds }
        })
        .populate('student', 'name rollNumber section')
        .populate('subject', 'name code')
        .sort({ createdAt: -1 });

        // Fetch notes uploaded by this teacher
        const notes = await Note.find({
            uploadedBy: teacherId
        })
        .populate('subject', 'name code')
        .sort({ createdAt: -1 });

        // Fetch teaching timetable schedule for this teacher
        const schedules = await Timetable.find({
            'slots.teacher': teacherId
        })
        .populate('slots.subject', 'code name')
        .sort({ day: 1 });

        // Fetch results published by this teacher
        const publishedResults = await Result.find({
            publishedBy: teacherId
        })
        .populate('student', 'name rollNumber section')
        .populate('subject', 'code name')
        .sort({ publishedAt: -1 })
        .limit(50);

        const pendingDoubts = notifications.filter(n => n.status === 'pending');
        const resolvedDoubts = notifications.filter(n => n.status === 'resolved');

        res.render('teacher/dashboard', {
            user: req.session.user,
            subjects: subjects || [],
            notifications: pendingDoubts || [],
            resolvedDoubts: resolvedDoubts || [],
            notes: notes || [],
            schedules: schedules || [],
            publishedResults: publishedResults || [],
            stats: {
                totalSubjects: subjects.length,
                totalNotes: notes.length,
                pendingDoubts: pendingDoubts.length,
                resolvedDoubts: resolvedDoubts.length,
                publishedResults: publishedResults.length
            }
        });
    } catch (error) {
        console.error('Error loading teacher dashboard:', error);
        res.status(500).render('error', { message: 'Server error while loading teacher dashboard' });
    }
};

exports.postSubject = async (req, res) => {
    try {
        const { code, name, sections } = req.body;
        if (!code || !name || !sections || typeof code !== 'string' || typeof name !== 'string') {
            req.session.errorMsg = 'Please provide subject code, name, and at least one section.';
            return res.redirect('/teacher/dashboard');
        }

        const normalizedCode = code.trim().toUpperCase();
        const existing = await Subject.findOne({ code: normalizedCode });
        if (existing) {
            req.session.errorMsg = `Subject code ${normalizedCode} already exists!`;
            return res.redirect('/teacher/dashboard');
        }

        const parsedSections = String(sections)
            .split(',')
            .map(s => s.trim().toUpperCase())
            .filter(Boolean);

        const subject = new Subject({
            code: normalizedCode,
            name: name.trim().substring(0, 100),
            sections: parsedSections,
            teacher: req.session.user.id
        });

        await subject.save();
        cache.delPattern('/api/subjects');
        cache.delPattern('/api/stats');
        req.session.successMsg = `Subject "${subject.code} - ${subject.name}" added successfully!`;
        res.redirect('/teacher/dashboard');
    } catch (error) {
        console.error('Error creating subject:', error);
        req.session.errorMsg = 'Failed to create subject. Please try again.';
        res.redirect('/teacher/dashboard');
    }
};

exports.postUploadNote = async (req, res) => {
    try {
        const { subjectId, title, description, section } = req.body;

        if (!subjectId || !title || !section || typeof title !== 'string' || typeof section !== 'string') {
            req.session.errorMsg = 'Subject, title, and section are required.';
            return res.redirect('/teacher/dashboard');
        }

        // Authorization / Row-Level Security: Ensure teacher teaches this subject
        const subject = await Subject.findOne({ _id: subjectId, teacher: req.session.user.id });
        if (!subject) {
            req.session.errorMsg = 'Unauthorized: You are not assigned to teach this subject.';
            return res.redirect('/teacher/dashboard');
        }

        let originalName = null;
        let fileSize = null;
        let fileType = null;
        let storedFilename = null;

        if (req.file) {
            storedFilename = req.file.filename;
            originalName = req.file.originalname;
            fileSize = req.file.size;
            fileType = path.extname(req.file.originalname).replace('.', '').toUpperCase();
        }

        const note = new Note({
            subject: subjectId,
            title: title.trim().substring(0, 150),
            description: description && typeof description === 'string' ? description.trim().substring(0, 500) : '',
            storedFilename,
            originalName,
            fileSize,
            fileType,
            section: section.trim().toUpperCase(),
            uploadedBy: req.session.user.id
        });

        // Set private authenticated download URL
        note.fileUrl = `/notes/download/${note._id}`;

        await note.save();
        cache.delPattern('/api/notes');
        cache.delPattern('/api/stats');
        req.session.successMsg = `Note "${note.title}" uploaded successfully!`;
        res.redirect('/teacher/dashboard#tab-manage-notes');
    } catch (error) {
        console.error('Error uploading note:', error);
        req.session.errorMsg = error.message || 'Failed to upload note.';
        res.redirect('/teacher/dashboard');
    }
};

// IDOR Fix: Resolve notification strictly if teacher owns the subject
exports.postResolveNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const { reply } = req.body;

        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            req.session.errorMsg = 'Invalid notification ID.';
            return res.redirect('/teacher/dashboard');
        }

        const notification = await Notification.findById(id).populate('subject');
        if (!notification) {
            req.session.errorMsg = 'Notification not found.';
            return res.redirect('/teacher/dashboard');
        }

        // Enforce ownership: only the teacher assigned to this subject can resolve it
        if (!notification.subject || String(notification.subject.teacher) !== String(req.session.user.id)) {
            req.session.errorMsg = 'Unauthorized: You can only resolve questions for your assigned subjects.';
            return res.redirect('/teacher/dashboard');
        }

        notification.status = 'resolved';
        notification.reply = reply && typeof reply === 'string' ? reply.trim().substring(0, 1000) : 'Resolved by teacher.';
        notification.resolvedBy = req.session.user.id;
        notification.resolvedAt = new Date();
        await notification.save();
        cache.delPattern('/api/stats');

        req.session.successMsg = '✅ Doubt has been resolved and answer sent to student!';
        res.redirect('/teacher/dashboard#tab-doubts');
    } catch (error) {
        console.error('Error resolving notification:', error);
        req.session.errorMsg = 'Failed to resolve notification.';
        res.redirect('/teacher/dashboard');
    }
};

// IDOR & Row-Level Security: Delete note strictly if owned by this teacher
exports.postDeleteNote = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            req.session.errorMsg = 'Invalid note ID.';
            return res.redirect('/teacher/dashboard');
        }

        const note = await Note.findOne({ _id: id, uploadedBy: req.session.user.id });
        if (!note) {
            req.session.errorMsg = 'Note not found or permission denied.';
            return res.redirect('/teacher/dashboard');
        }

        // Safely unlink physical file from storage (preventing directory traversal)
        const filename = note.storedFilename || (note.fileUrl ? path.basename(note.fileUrl) : null);
        if (filename) {
            const safeFilename = path.basename(filename);
            const privatePath = path.join(__dirname, '..', 'storage', 'uploads', safeFilename);
            const publicPath = path.join(__dirname, '..', 'public', 'uploads', safeFilename);
            if (fs.existsSync(privatePath)) fs.unlinkSync(privatePath);
            if (fs.existsSync(publicPath)) fs.unlinkSync(publicPath);
        }

        await Note.findByIdAndDelete(id);
        cache.delPattern('/api/notes');
        cache.delPattern('/api/stats');
        req.session.successMsg = `Note "${note.title}" has been deleted.`;
        res.redirect('/teacher/dashboard#tab-manage-notes');
    } catch (error) {
        console.error('Error deleting note:', error);
        req.session.errorMsg = 'Failed to delete note.';
        res.redirect('/teacher/dashboard');
    }
};

// Row-Level Security: Teacher can only publish results for subjects they teach
exports.postPublishResult = async (req, res) => {
    try {
        const { rollNumber, subjectId, examName, marksObtained, maxMarks, remarks } = req.body;
        if (!rollNumber || !subjectId || !examName) {
            req.session.errorMsg = 'Roll number, subject, and exam name are required.';
            return res.redirect('/teacher/dashboard#tab-results');
        }

        // Verify teacher teaches this subject
        const subject = await Subject.findOne({ _id: subjectId, teacher: req.session.user.id });
        if (!subject) {
            req.session.errorMsg = 'Unauthorized: You can only publish grades for subjects you teach.';
            return res.redirect('/teacher/dashboard#tab-results');
        }

        const normalizedRoll = String(rollNumber).trim().toUpperCase();
        const student = await User.findOne({ rollNumber: normalizedRoll, role: 'student' });
        if (!student) {
            req.session.errorMsg = `No student found with Roll Number ${normalizedRoll}!`;
            return res.redirect('/teacher/dashboard#tab-results');
        }

        const parsedMarks = parseFloat(marksObtained);
        const parsedMax = parseFloat(maxMarks) || 100;

        if (isNaN(parsedMarks) || parsedMarks < 0 || parsedMarks > parsedMax) {
            req.session.errorMsg = `Marks obtained must be between 0 and ${parsedMax}.`;
            return res.redirect('/teacher/dashboard#tab-results');
        }

        const result = new Result({
            student: student._id,
            subject: subjectId,
            examName: String(examName).trim().substring(0, 100),
            marksObtained: parsedMarks,
            maxMarks: parsedMax,
            remarks: remarks && typeof remarks === 'string' ? remarks.trim().substring(0, 200) : 'Satisfactory',
            publishedBy: req.session.user.id
        });

        await result.save();
        req.session.successMsg = `Grade successfully published for ${student.name} (${student.rollNumber})!`;
        res.redirect('/teacher/dashboard#tab-results');
    } catch (error) {
        console.error('Error publishing teacher result:', error);
        req.session.errorMsg = 'Failed to publish examination result.';
        res.redirect('/teacher/dashboard#tab-results');
    }
};
