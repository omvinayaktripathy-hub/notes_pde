// Middleware to verify session and role with both JSON API and web page support
const isApiRequest = (req) => {
    return req.xhr || 
           req.path.startsWith('/api') || 
           (req.headers.accept && req.headers.accept.includes('application/json'));
};

const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        if (isApiRequest(req)) {
            return res.status(401).json({ error: 'Authentication required. Please sign in.' });
        }
        return res.redirect('/');
    }
    next();
};

const requireStudent = (req, res, next) => {
    if (!req.session || !req.session.user || req.session.user.role !== 'student') {
        if (isApiRequest(req)) {
            return res.status(403).json({ error: 'Forbidden: Student privileges required.' });
        }
        return res.redirect('/login/student');
    }
    next();
};

const requireTeacher = (req, res, next) => {
    if (!req.session || !req.session.user || req.session.user.role !== 'teacher') {
        if (isApiRequest(req)) {
            return res.status(403).json({ error: 'Forbidden: Faculty privileges required.' });
        }
        return res.redirect('/login/teacher');
    }
    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
        if (isApiRequest(req)) {
            return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
        }
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
