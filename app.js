const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/notes_platform'
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/notes_platform')
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// Models
const User = require('./models/User');
const Subject = require('./models/Subject');
const Note = require('./models/Note');
const Notification = require('./models/Notification');

// Routes
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const teacherRoutes = require('./routes/teacher');

app.use('/', authRoutes);
app.use('/student', studentRoutes);
app.use('/teacher', teacherRoutes);

// Home route
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';   // ← Listen on all network interfaces

app.listen(PORT, HOST, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Access from mobile: http://<YOUR-PC-IP>:${PORT}`);
});