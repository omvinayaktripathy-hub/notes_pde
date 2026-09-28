// Middleware to verify session and role
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/');
    }
    next();
};

const requireStudent = (req, res, next) => {
    if (!req.session || !req.session.user || req.session.user.role !== 'student') {
        return res.redirect('/login/student');
    }
    next();
};

const requireTeacher = (req, res, next) => {
    if (!req.session || !req.session.user || req.session.user.role !== 'teacher') {
        return res.redirect('/login/teacher');
    }
    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/login/admin');
    }
    next();
};

// Pass user and flash messages to all templates seamlessly
const userContext = (req, res, next) => {
    res.locals.currentUser = req.session ? req.session.user : null;
    res.locals.successMsg = req.session ? req.session.successMsg : null;
    res.locals.errorMsg = req.session ? req.session.errorMsg : null;
    if (req.session) {
        delete req.session.successMsg;
        delete req.session.errorMsg;
    }
    next();
};

module.exports = {
    requireAuth,
    requireStudent,
    requireTeacher,
    requireAdmin,
    userContext
};
