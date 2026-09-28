const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Welcome / landing page
router.get('/', authController.getHome);

// Login pages
router.get('/login', (req, res) => res.redirect('/'));
router.get('/login/student', authController.getStudentLogin);
router.get('/login/teacher', authController.getTeacherLogin);
router.get('/login/admin', authController.getAdminLogin);

// Login handlers
router.post('/login/student', authController.postStudentLogin);
router.post('/login/teacher', authController.postTeacherLogin);
router.post('/login/admin', authController.postAdminLogin);

// Logout
router.get('/logout', authController.logout);

module.exports = router;
