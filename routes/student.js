const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Subject = require('../models/Subject');
const Note = require('../models/Note');
const Notification = require('../models/Notification');

// Auth middleware for students
router.use(async (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'student') {
        return res.redirect('/login');
    }
    next();
});

// Student dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const student = await User.findById(req.session.user.id)
            .populate('subjects');
        
        const notes = await Note.find({
            section: student.section,
            subject: { $in: student.subjects }
        }).populate('subject');
        
        res.render('student/dashboard', {
            user: req.session.user,
            subjects: student.subjects,
            notes: notes
        });
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// View notes by subject
router.get('/notes/:subjectId', async (req, res) => {
    try {
        const student = await User.findById(req.session.user.id);
        const notes = await Note.find({
            subject: req.params.subjectId,
            section: student.section
        }).populate('subject');
        
        res.render('student/notes', { notes, user: req.session.user });
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// Create notification
router.post('/notification', async (req, res) => {
    try {
        const { subjectId, message } = req.body;
        const notification = new Notification({
            student: req.session.user.id,
            subject: subjectId,
            message: message
        });
        await notification.save();
        res.redirect('/student/dashboard');
    } catch (error) {
        res.status(500).send('Server error');
    }
});

module.exports = router;
