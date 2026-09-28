const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { requireStudent } = require('../middleware/auth');

// Auth guard for all student routes
router.use(requireStudent);

// Student dashboard
router.get('/dashboard', studentController.getDashboard);

// Subject specific notes
router.get('/notes/:subjectId', studentController.getNotesBySubject);

// Ask a doubt
router.post('/notification', studentController.postDoubt);

module.exports = router;
