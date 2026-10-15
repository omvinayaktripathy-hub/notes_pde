const path = require('path');
const fs = require('fs');
const Note = require('../models/Note');
const Subject = require('../models/Subject');
const User = require('../models/User');

/**
 * Secure, authenticated, authorization-checked file downloader (Private Storage)
 */
exports.downloadNote = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).render('error', { title: 'Invalid Request', message: 'Invalid note identifier.' });
        }

        const note = await Note.findById(id).populate('subject');
        if (!note) {
            return res.status(404).render('error', { title: 'File Not Found', message: 'The requested note does not exist.' });
        }

        const currentUser = req.session.user;

        // Authorization check
        if (currentUser.role === 'student') {
            const student = await User.findById(currentUser.id);
            const isMatchingSection = note.section === 'ALL' || note.section === 'All' || note.section === student?.section;
            if (!isMatchingSection) {
                return res.status(403).render('error', { title: 'Access Denied', message: 'This note is not designated for your section.' });
            }
        } else if (currentUser.role === 'teacher') {
            const isUploader = String(note.uploadedBy) === String(currentUser.id);
            const isAssignedTeacher = note.subject && String(note.subject.teacher) === String(currentUser.id);
            if (!isUploader && !isAssignedTeacher) {
                return res.status(403).render('error', { title: 'Access Denied', message: 'You are not authorized to view notes for this subject.' });
            }
        } else if (currentUser.role !== 'admin') {
            return res.status(403).render('error', { title: 'Access Denied', message: 'Unauthorized role.' });
        }

        // Determine stored file location and prevent path traversal
        const filename = note.storedFilename || (note.fileUrl ? path.basename(note.fileUrl) : null);
        if (!filename) {
            return res.status(404).render('error', { title: 'File Missing', message: 'No file attachment found for this note.' });
        }

        const safeFilename = path.basename(filename);
        const privatePath = path.join(__dirname, '..', 'storage', 'uploads', safeFilename);
        const legacyPath = path.join(__dirname, '..', 'public', 'uploads', safeFilename);

        let targetPath = null;
        if (fs.existsSync(privatePath)) {
            targetPath = privatePath;
        } else if (fs.existsSync(legacyPath)) {
            targetPath = legacyPath;
        } else {
            return res.status(404).render('error', { title: 'File Missing', message: 'The file could not be located on the server storage.' });
        }

        // Security headers to prevent MIME sniffing and script execution
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'private, no-transform, no-store, max-age=0');

        const downloadName = note.originalName || safeFilename;
        return res.download(targetPath, downloadName);
    } catch (error) {
        console.error('File download error:', error);
        res.status(500).render('error', { title: 'Download Error', message: 'Failed to retrieve file.' });
    }
};
