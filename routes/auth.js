const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Home page (welcome with 2 buttons)
router.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect(`/${req.session.user.role}/dashboard`);
    }
    res.render('index');
});

// Student login page
router.get('/login/student', (req, res) => {
    if (req.session.user) {
        return res.redirect(`/${req.session.user.role}/dashboard`);
    }
    res.render('login-student', { error: null });
});

// Teacher login page
router.get('/login/teacher', (req, res) => {
    if (req.session.user) {
        return res.redirect(`/${req.session.user.role}/dashboard`);
    }
    res.render('login-teacher', { error: null });
});

// Legacy /login - redirect to student login by default
router.get('/login', (req, res) => {
    res.redirect('/');
});

// Student login handler
router.post('/login/student', async (req, res) => {
    try {
        const { rollNumber, password } = req.body;
        const user = await User.findOne({ rollNumber });

        if (!user || user.role !== 'student') {
            return res.render('login-student', { error: 'Invalid student credentials' });
        }

        const isValid = await user.comparePassword(password);
        if (!isValid) {
            return res.render('login-student', { error: 'Invalid student credentials' });
        }

        req.session.user = {
            id: user._id,
            rollNumber: user.rollNumber,
            name: user.name,
            role: user.role,
            section: user.section
        };

        res.redirect('/student/dashboard');
    } catch (error) {
        console.error(error);
        res.render('login-student', { error: 'Login failed' });
    }
});

// Teacher login handler
router.post('/login/teacher', async (req, res) => {
    try {
        const { rollNumber, password } = req.body;
        const user = await User.findOne({ rollNumber });

        if (!user || user.role !== 'teacher') {
            return res.render('login-teacher', { error: 'Invalid teacher credentials' });
        }

        const isValid = await user.comparePassword(password);
        if (!isValid) {
            return res.render('login-teacher', { error: 'Invalid teacher credentials' });
        }

        req.session.user = {
            id: user._id,
            rollNumber: user.rollNumber,
            name: user.name,
            role: user.role,
            section: user.section
        };

        res.redirect('/teacher/dashboard');
    } catch (error) {
        console.error(error);
        res.render('login-teacher', { error: 'Login failed' });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;
