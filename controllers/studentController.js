const User = require('../models/User');
const Subject = require('../models/Subject');
const Note = require('../models/Note');
const Notification = require('../models/Notification');
const Timetable = require('../models/Timetable');
const Result = require('../models/Result');

exports.getDashboard = async (req, res) => {
    try {
        const student = await User.findById(req.session.user.id).populate('subjects');
        if (!student) {
            req.session.destroy();
            return res.redirect('/login/student');
        }

        const studentSubjectIds = (student.subjects || []).map(s => s._id);

        // Fetch notes for student's section and enrolled subjects
        const notes = await Note.find({
            section: { $in: [student.section, 'ALL', 'All'] },
            subject: { $in: studentSubjectIds }
        })
        .populate('subject')
        .populate('uploadedBy', 'name rollNumber')
        .sort({ createdAt: -1 });

        // Fetch doubts asked by this student
        const doubts = await Notification.find({
            student: student._id
        })
        .populate('subject', 'code name')
        .populate('resolvedBy', 'name')
        .sort({ createdAt: -1 });

        // Fetch timetable for student's section
        const timetables = await Timetable.find({
            section: student.section
        })
        .populate('slots.subject', 'code name')
        .populate('slots.teacher', 'name')
        .sort({ day: 1 });

        // Fetch academic results for this student
        const results = await Result.find({
            student: student._id
        })
        .populate('subject', 'code name')
        .populate('publishedBy', 'name')
        .sort({ publishedAt: -1 });

        const pendingDoubtsCount = doubts.filter(d => d.status === 'pending').length;
        const resolvedDoubtsCount = doubts.filter(d => d.status === 'resolved').length;

        // Calculate average performance if results exist
        let totalScore = 0;
        let totalMax = 0;
        results.forEach(r => {
            totalScore += r.marksObtained;
            totalMax += r.maxMarks;
        });
        const gpaPercentage = totalMax > 0 ? ((totalScore / totalMax) * 100).toFixed(1) : null;

        res.render('student/dashboard', {
            user: req.session.user,
            student,
            subjects: student.subjects || [],
            notes: notes || [],
            doubts: doubts || [],
            timetables: timetables || [],
            results: results || [],
            gpaPercentage,
            stats: {
                totalSubjects: (student.subjects || []).length,
                totalNotes: notes.length,
                pendingDoubts: pendingDoubtsCount,
                resolvedDoubts: resolvedDoubtsCount,
                totalResults: results.length
            }
        });
    } catch (error) {
        console.error('Error loading student dashboard:', error);
        res.status(500).render('error', { message: 'Server error while loading student dashboard' });
    }
};

exports.getNotesBySubject = async (req, res) => {
    try {
        const student = await User.findById(req.session.user.id);
        const subject = await Subject.findById(req.params.subjectId);

        if (!subject) {
            return res.redirect('/student/dashboard');
        }

        const notes = await Note.find({
            subject: req.params.subjectId,
            section: { $in: [student.section, 'ALL', 'All'] }
        })
        .populate('subject')
        .populate('uploadedBy', 'name')
        .sort({ createdAt: -1 });

        res.render('student/notes', {
            notes,
            subject,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching subject notes:', error);
        res.status(500).render('error', { message: 'Server error while loading subject notes' });
    }
};

exports.postDoubt = async (req, res) => {
    try {
        const { subjectId, message } = req.body;
        if (!subjectId || !message || !message.trim()) {
            req.session.errorMsg = 'Please select a subject and write your question.';
            return res.redirect('/student/dashboard');
        }

        const notification = new Notification({
            student: req.session.user.id,
            subject: subjectId,
            message: message.trim()
        });

        await notification.save();
        req.session.successMsg = '✅ Your question has been sent to your teacher!';
        res.redirect('/student/dashboard#tab-doubts');
    } catch (error) {
        console.error('Error submitting doubt:', error);
        req.session.errorMsg = 'Failed to submit your question. Please try again.';
        res.redirect('/student/dashboard');
    }
};
