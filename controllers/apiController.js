const Note = require('../models/Note');
const Subject = require('../models/Subject');
const Notification = require('../models/Notification');

// Safe regex escape to prevent ReDoS
const escapeRegex = (string) => {
    return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Search notes API with Row-Level Security (RLS) and ReDoS protection
exports.searchNotes = async (req, res) => {
    try {
        const { q, subjectId, section } = req.query;
        const filter = {};
        const currentUser = req.session ? req.session.user : null;

        // Row-Level Security: Students can only search notes for their section or 'ALL'
        if (currentUser && currentUser.role === 'student') {
            filter.section = { $in: [currentUser.section, 'ALL', 'All'] };
        } else if (section && typeof section === 'string') {
            filter.section = String(section).trim().toUpperCase();
        }

        if (subjectId && typeof subjectId === 'string' && subjectId.match(/^[0-9a-fA-F]{24}$/)) {
            filter.subject = subjectId;
        }

        if (q && typeof q === 'string' && q.trim().length > 0) {
            const sanitizedQuery = escapeRegex(q.trim().substring(0, 100));
            filter.$or = [
                { title: { $regex: sanitizedQuery, $options: 'i' } },
                { description: { $regex: sanitizedQuery, $options: 'i' } }
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

// Get stats API
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
