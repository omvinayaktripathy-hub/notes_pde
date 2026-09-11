const express = require('express');
const router = express.Router();
const multer = require('multer');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Note = require('../models/Note');
const Notification = require('../models/Notification');

const upload = multer({ dest: 'public/uploads/' });

// Auth middleware for teachers
router.use(async (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'teacher') {
        return res.redirect('/login');
    }
    next();
});

// Teacher dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const subjects = await Subject.find({ teacher: req.session.user.id });
        const notifications = await Notification.find({ status: 'pending' })
            .populate('student')
            .populate('subject');
        
        res.render('teacher/dashboard', {
            user: req.session.user,
            subjects: subjects,
            notifications: notifications
        });
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// Add subject
router.post('/subject', async (req, res) => {
    try {
        const { code, name, sections } = req.body;
        const subject = new Subject({
            code,
            name,
            sections: sections.split(',').map(s => s.trim()),
            teacher: req.session.user.id
        });
        await subject.save();
        res.redirect('/teacher/dashboard');
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// Upload note
router.post('/upload-note', upload.single('file'), async (req, res) => {
    try {
        const { subjectId, title, description, section } = req.body;
        const note = new Note({
            subject: subjectId,
            title,
            description,
            fileUrl: req.file ? '/uploads/' + req.file.filename : null,
            section: section,
            uploadedBy: req.session.user.id
        });
        await note.save();
        res.redirect('/teacher/dashboard');
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// Resolve notification
router.post('/resolve-notification/:id', async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { status: 'resolved' });
        res.redirect('/teacher/dashboard');
    } catch (error) {
        res.status(500).send('Server error');
    }
});

module.exports = router;
