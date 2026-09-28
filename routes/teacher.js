const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const teacherController = require('../controllers/teacherController');
const { requireTeacher } = require('../middleware/auth');

// Auth guard for all teacher routes
router.use(requireTeacher);

// Teacher dashboard
router.get('/dashboard', teacherController.getDashboard);

// Add subject
router.post('/subject', teacherController.postSubject);

// Upload note (with extension preservation and size limits)
router.post('/upload-note', upload.single('file'), teacherController.postUploadNote);

// Resolve notification with teacher reply
router.post('/resolve-notification/:id', teacherController.postResolveNotification);

// Delete note
router.post('/delete-note/:id', teacherController.postDeleteNote);

// Publish student exam result
router.post('/result', teacherController.postPublishResult);

module.exports = router;
