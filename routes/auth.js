const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const { verifyCaptcha } = require('../middleware/security');

// Welcome / landing page (Strictly for students & public campus learning)
router.get('/', authController.getHome);

// Dedicated Portal Login Pages
router.get('/login', (req, res) => res.redirect('/login/student'));
router.get('/login/student', authController.getStudentLogin);
router.get('/login/teacher', authController.getTeacherLogin);
router.get('/faculty', (req, res) => res.redirect('/login/teacher'));
router.get('/login/admin', authController.getAdminLogin);

// Login handlers protected by Rate Limiting and CAPTCHA
router.post('/login/student', authLimiter, verifyCaptcha, authController.postStudentLogin);
router.post('/login/teacher', authLimiter, verifyCaptcha, authController.postTeacherLogin);
router.post('/login/admin', authLimiter, verifyCaptcha, authController.postAdminLogin);

// Logout
router.get('/logout', authController.logout);

module.exports = router;
