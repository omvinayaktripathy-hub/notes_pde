const Note = require('../models/Note');
const Subject = require('../models/Subject');
const Notification = require('../models/Notification');

// Search notes API for live client-side filtering
exports.searchNotes = async (req, res) => {
    try {
        const { q, subjectId, section } = req.query;
        const filter = {};

        if (section) {
            filter.section = section;
        }

        if (subjectId) {
            filter.subject = subjectId;
        }

        if (q && q.trim()) {
            filter.$or = [
                { title: { $regex: q.trim(), $options: 'i' } },
                { description: { $regex: q.trim(), $options: 'i' } }
            ];
        }

        const notes = await Note.find(filter)
            .populate('subject', 'code name')
            .populate('uploadedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({ success: true, count: notes.length, notes });
    } catch (error) {
        console.error('API search notes error:', error);
        res.status(500).json({ success: false, error: 'Failed to search notes' });
    }
};

// Get subjects API
exports.getSubjects = async (req, res) => {
    try {
        const subjects = await Subject.find({}).sort({ code: 1 });
        res.json({ success: true, subjects });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch subjects' });
    }
};

// Get stats
exports.getStats = async (req, res) => {
    try {
        const noteCount = await Note.countDocuments();
        const subjectCount = await Subject.countDocuments();
        const doubtCount = await Notification.countDocuments();
        res.json({ success: true, stats: { notes: noteCount, subjects: subjectCount, doubts: doubtCount } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
};
