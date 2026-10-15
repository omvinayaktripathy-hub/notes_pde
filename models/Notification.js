const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true,
        index: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'resolved'],
        default: 'pending',
        index: true
    },
    reply: {
        type: String,
        default: '',
        trim: true
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolvedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound Indexes for fast teacher and student doubt queries
NotificationSchema.index({ subject: 1, status: 1 });
NotificationSchema.index({ student: 1, createdAt: -1 });
NotificationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
