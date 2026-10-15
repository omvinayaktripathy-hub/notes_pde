const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('./config/db');
const validateEnv = require('./config/validateEnv');
const { userContext } = require('./middleware/auth');
const { globalLimiter } = require('./middleware/rateLimiter');

// Validate environment variables and security posture
validateEnv();

// Connect to MongoDB
connectDB();

const app = express();

// Disable X-Powered-By to prevent framework fingerprinting
app.disable('x-powered-by');

// Pre-initialize template locals so views and error pages never hit undeclared reference errors
app.use((req, res, next) => {
    res.locals.currentUser = null;
    res.locals.successMsg = null;
    res.locals.errorMsg = null;
    next();
});

// Health Check Probe for Load Balancers & Auto-Scalers
app.get('/health', (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    res.status(isDbConnected ? 200 : 503).json({
        status: isDbConnected ? 'UP' : 'DEGRADED',
        database: isDbConnected ? 'connected' : 'disconnected',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

// Trust reverse proxy for accurate IP address resolution in rate limiting and secure cookies
app.set('trust proxy', 1);

// Security Headers with Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://challenges.cloudflare.com"],
            frameSrc: ["https://challenges.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", "https://challenges.cloudflare.com"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Lock down CORS safely without throwing uncaught 500 crashes
const customAllowed = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) 
    : [];

app.use(cors({
    origin: (origin, callback) => {
        // Direct navigations or curl/server-to-server requests have no origin header
        if (!origin) return callback(null, true);

        // Allow localhost origins in dev or test
        if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            return callback(null, true);
        }

        // Allow all onrender.com hostnames (e.g. notes-pde-1.onrender.com)
        if (origin.endsWith('.onrender.com') || origin.includes('onrender.com')) {
            return callback(null, true);
        }

        // Allow custom configured origins
        if (customAllowed.length > 0 && customAllowed.includes(origin)) {
            return callback(null, true);
        }

        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }

        // Cleanly decline CORS headers without throwing an Express error that crashes the route
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Prevent NoSQL Query Injection (sanitizes $, .)
app.use(mongoSanitize());

// Apply global rate limiting across all incoming requests
app.use(globalLimiter);

// Body parser & cookie middleware with strict size limits
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Protected /uploads route (Prevents direct unauthenticated file scraping)
app.use('/uploads', (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).render('error', {
            title: 'Authentication Required',
            message: 'You must be logged in to access platform files.'
        });
    }
    const safeFilename = path.basename(req.path);
    const privatePath = path.join(__dirname, 'storage', 'uploads', safeFilename);
    const legacyPath = path.join(__dirname, 'public', 'uploads', safeFilename);

    if (fs.existsSync(privatePath)) {
        return res.download(privatePath);
    } else if (fs.existsSync(legacyPath)) {
        return res.download(legacyPath);
    }
    res.status(404).render('error', { title: 'File Missing', message: 'Requested file not found.' });
});

// Static assets (Frontend styles, scripts, client images ONLY)
app.use(express.static(path.join(__dirname, 'public')));

// View engine configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration with HTTPS-only cookies in production
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
    name: 'notes_session',
    secret: process.env.SESSION_SECRET || 'notes_platform_super_secret_production_key_change_in_env',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/notes_platform',
        touchAfter: 24 * 3600 // lazy session update once in 24 hours
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: true, // Prevents XSS cookie theft
        sameSite: 'lax', // CSRF mitigation
        secure: isProduction // Transmit over HTTPS strictly in production
    }
}));

// Global template context middleware (current user, alerts)
app.use(userContext);

// Routes
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const teacherRoutes = require('./routes/teacher');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const notesRoutes = require('./routes/notes');

app.use('/', authRoutes);
app.use('/student', studentRoutes);
app.use('/teacher', teacherRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/notes', notesRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', {
        statusCode: 404,
        title: '404 - Page Not Found',
        message: 'The page or academic resource you are looking for does not exist or has been moved.'
    });
});

// Global error handler with Debug Mode Off in Production
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    const isProd = process.env.NODE_ENV === 'production';
    const status = err.status || 500;

    res.locals.currentUser = (req.session && req.session.user) ? req.session.user : null;
    res.locals.successMsg = null;
    res.locals.errorMsg = null;

    try {
        res.status(status).render('error', {
            statusCode: status,
            title: status === 404 ? '404 - Page Not Found' : 'Server Error',
            message: isProd 
                ? 'An internal error occurred. Please contact the administrator.' 
                : (err.message || 'Something went wrong on our end.')
        });
    } catch (renderErr) {
        console.error('Failed to render error template:', renderErr);
        res.status(status).send('An unexpected server error occurred. Please try again.');
    }
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`🚀 Notes Platform Server running on http://localhost:${PORT}`);
    console.log(`🔒 Security headers, rate limiting, and private storage enabled.`);
});

module.exports = app;