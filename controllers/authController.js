const User = require('../models/User');

exports.getHome = (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect(`/${req.session.user.role}/dashboard`);
    }
    res.render('index');
};

exports.getStudentLogin = (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect(`/${req.session.user.role}/dashboard`);
    }
    res.render('login-student', { error: null });
};

exports.getTeacherLogin = (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect(`/${req.session.user.role}/dashboard`);
    }
    res.render('login-teacher', { error: null });
};

exports.getAdminLogin = (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect(`/${req.session.user.role}/dashboard`);
    }
    res.render('login-admin', { error: null });
};

exports.postStudentLogin = async (req, res) => {
    try {
        const { rollNumber, password } = req.body;
        const normalizedRoll = (rollNumber || '').trim().toUpperCase();

        const user = await User.findOne({ rollNumber: normalizedRoll });

        if (!user || user.role !== 'student') {
            return res.render('login-student', { error: 'Invalid Student Roll Number or Credentials' });
        }

        const isValid = await user.comparePassword(password);
        if (!isValid) {
            return res.render('login-student', { error: 'Invalid password. Please check and try again.' });
        }

        req.session.user = {
            id: user._id,
            rollNumber: user.rollNumber,
            name: user.name,
            role: user.role,
            section: user.section
        };
        req.session.successMsg = `Welcome back, ${user.name}!`;

        res.redirect('/student/dashboard');
    } catch (error) {
        console.error('Student login error:', error);
        res.render('login-student', { error: 'An unexpected error occurred during login.' });
    }
};

exports.postTeacherLogin = async (req, res) => {
    try {
        const { rollNumber, password } = req.body;
        const normalizedId = (rollNumber || '').trim().toUpperCase();

        const user = await User.findOne({ rollNumber: normalizedId });

        if (!user || user.role !== 'teacher') {
            return res.render('login-teacher', { error: 'Invalid Teacher ID or Credentials' });
        }

        const isValid = await user.comparePassword(password);
        if (!isValid) {
            return res.render('login-teacher', { error: 'Invalid password. Please check and try again.' });
        }

        req.session.user = {
            id: user._id,
            rollNumber: user.rollNumber,
            name: user.name,
            role: user.role,
            section: user.section
        };
        req.session.successMsg = `Welcome, Professor ${user.name}!`;

        res.redirect('/teacher/dashboard');
    } catch (error) {
        console.error('Teacher login error:', error);
        res.render('login-teacher', { error: 'An unexpected error occurred during login.' });
    }
};

exports.postAdminLogin = async (req, res) => {
    try {
        const { rollNumber, password } = req.body;
        const normalizedId = (rollNumber || '').trim().toUpperCase();

        const user = await User.findOne({ rollNumber: normalizedId });

        if (!user || user.role !== 'admin') {
            return res.render('login-admin', { error: 'Invalid Admin Credentials' });
        }

        const isValid = await user.comparePassword(password);
        if (!isValid) {
            return res.render('login-admin', { error: 'Invalid password. Access denied.' });
        }

        req.session.user = {
            id: user._id,
            rollNumber: user.rollNumber,
            name: user.name,
            role: user.role,
            section: 'All'
        };
        req.session.successMsg = `Welcome, Administrator ${user.name}!`;

        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error('Admin login error:', error);
        res.render('login-admin', { error: 'An unexpected error occurred during admin authentication.' });
    }
};

exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) console.error('Logout error:', err);
        res.redirect('/');
    });
};
