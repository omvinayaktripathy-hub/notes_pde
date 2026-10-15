const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    actorName: {
        type: String,
        required: true
    },
    actorRole: {
        type: String,
        required: true,
        index: true
    },
    action: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    targetType: {
        type: String,
        required: true,
        trim: true
    },
    targetId: {
        type: String,
        trim: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed
    },
    ip: {
        type: String
    },
    userAgent: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Indexes for fast security audit querying and timeline review
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actor: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
