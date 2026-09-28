const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');

// Protect all admin routes
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Students
router.post('/student', adminController.postAddStudent);
router.post('/student/delete/:id', adminController.postDeleteStudent);

// Teachers
router.post('/teacher', adminController.postAddTeacher);
router.post('/teacher/delete/:id', adminController.postDeleteTeacher);

// Subjects
router.post('/subject', adminController.postAddSubject);
router.post('/subject/delete/:id', adminController.postDeleteSubject);

// Timetable
router.post('/timetable/slot', adminController.postAddTimetableSlot);
router.post('/timetable/delete/:id', adminController.postDeleteTimetable);

// Results
router.post('/result', adminController.postPublishResult);
router.post('/result/delete/:id', adminController.postDeleteResult);

module.exports = router;
