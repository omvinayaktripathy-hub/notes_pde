const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Welcome / landing page (Strictly for students & public campus learning)
router.get('/', authController.getHome);

// Dedicated Portal Login Pages
router.get('/login', (req, res) => res.redirect('/login/student'));
router.get('/login/student', authController.getStudentLogin);
router.get('/login/teacher', authController.getTeacherLogin);
router.get('/faculty', (req, res) => res.redirect('/login/teacher'));
router.get('/login/admin', authController.getAdminLogin);

// Login handlers
router.post('/login/student', authController.postStudentLogin);
router.post('/login/teacher', authController.postTeacherLogin);
router.post('/login/admin', authController.postAdminLogin);

// Logout
router.get('/logout', authController.logout);

module.exports = router;
