const fs = require('fs');
const path = require('path');
const Subject = require('../models/Subject');
const Note = require('../models/Note');
const Notification = require('../models/Notification');
const Timetable = require('../models/Timetable');
const Result = require('../models/Result');
const User = require('../models/User');

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
        if (!code || !name || !sections) {
            req.session.errorMsg = 'Please provide subject code, name, and at least one section.';
            return res.redirect('/teacher/dashboard');
        }

        const normalizedCode = code.trim().toUpperCase();
        const existing = await Subject.findOne({ code: normalizedCode });
        if (existing) {
            req.session.errorMsg = `Subject code ${normalizedCode} already exists!`;
            return res.redirect('/teacher/dashboard');
        }

        const parsedSections = sections
            .split(',')
            .map(s => s.trim().toUpperCase())
            .filter(Boolean);

        const subject = new Subject({
            code: normalizedCode,
            name: name.trim(),
            sections: parsedSections,
            teacher: req.session.user.id
        });

        await subject.save();
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

        if (!subjectId || !title || !section) {
            req.session.errorMsg = 'Subject, title, and section are required.';
            return res.redirect('/teacher/dashboard');
        }

        let fileUrl = null;
        let originalName = null;
        let fileSize = null;
        let fileType = null;

        if (req.file) {
            fileUrl = '/uploads/' + req.file.filename;
            originalName = req.file.originalname;
            fileSize = req.file.size;
            fileType = path.extname(req.file.originalname).replace('.', '').toUpperCase();
        }

        const note = new Note({
            subject: subjectId,
            title: title.trim(),
            description: description ? description.trim() : '',
            fileUrl,
            originalName,
            fileSize,
            fileType,
            section: section.trim().toUpperCase(),
            uploadedBy: req.session.user.id
        });

        await note.save();
        req.session.successMsg = `Note "${note.title}" uploaded successfully!`;
        res.redirect('/teacher/dashboard#notes-tab');
    } catch (error) {
        console.error('Error uploading note:', error);
        req.session.errorMsg = error.message || 'Failed to upload note.';
        res.redirect('/teacher/dashboard');
    }
};

exports.postResolveNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const { reply } = req.body;

        await Notification.findByIdAndUpdate(id, {
            status: 'resolved',
            reply: reply ? reply.trim() : 'Resolved by teacher.',
            resolvedBy: req.session.user.id,
            resolvedAt: new Date()
        });

        req.session.successMsg = '✅ Doubt has been resolved and answer sent to student!';
        res.redirect('/teacher/dashboard#doubts-section');
    } catch (error) {
        console.error('Error resolving notification:', error);
        req.session.errorMsg = 'Failed to resolve notification.';
        res.redirect('/teacher/dashboard');
    }
};

exports.postDeleteNote = async (req, res) => {
    try {
        const { id } = req.params;
        const note = await Note.findOne({ _id: id, uploadedBy: req.session.user.id });

        if (!note) {
            req.session.errorMsg = 'Note not found or permission denied.';
            return res.redirect('/teacher/dashboard');
        }

        // Delete physical file if exists
        if (note.fileUrl) {
            const filePath = path.join(__dirname, '..', 'public', note.fileUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await Note.findByIdAndDelete(id);
        req.session.successMsg = `Note "${note.title}" has been deleted.`;
        res.redirect('/teacher/dashboard#notes-tab');
    } catch (error) {
        console.error('Error deleting note:', error);
        req.session.errorMsg = 'Failed to delete note.';
        res.redirect('/teacher/dashboard');
    }
};

// Teacher post result
exports.postPublishResult = async (req, res) => {
    try {
        const { rollNumber, subjectId, examName, marksObtained, maxMarks, remarks } = req.body;
        const normalizedRoll = rollNumber.trim().toUpperCase();

        const student = await User.findOne({ rollNumber: normalizedRoll, role: 'student' });
        if (!student) {
            req.session.errorMsg = `No student found with Roll Number ${normalizedRoll}!`;
            return res.redirect('/teacher/dashboard#tab-results');
        }

        const result = new Result({
            student: student._id,
            subject: subjectId,
            examName: examName.trim(),
            marksObtained: parseFloat(marksObtained),
            maxMarks: parseFloat(maxMarks) || 100,
            remarks: remarks ? remarks.trim() : 'Satisfactory',
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
