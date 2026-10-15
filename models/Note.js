const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    fileUrl: {
        type: String
    },
    storedFilename: {
        type: String
    },
    originalName: {
        type: String
    },
    fileSize: {
        type: Number
    },
    fileType: {
        type: String
    },
    section: {
        type: String,
        required: true,
        index: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound & Performance Indexes
NoteSchema.index({ subject: 1, section: 1 });
NoteSchema.index({ section: 1, createdAt: -1 });
NoteSchema.index({ uploadedBy: 1, createdAt: -1 });

// Full-Text Search Index for instant title & description queries
NoteSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Note', NoteSchema);
