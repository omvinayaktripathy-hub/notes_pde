const AuditLog = require('../models/AuditLog');

/**
 * Log sensitive administrative operations
 */
const logAdminAction = async ({ req, action, targetType, targetId, details }) => {
    try {
        if (!req || !req.session || !req.session.user) return;
        const user = req.session.user;
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        await AuditLog.create({
            actor: user.id,
            actorName: user.name,
            actorRole: user.role,
            action,
            targetType,
            targetId: targetId ? String(targetId) : null,
            details,
            ip,
            userAgent
        });
    } catch (err) {
        console.error('Failed to write audit log:', err);
    }
};

module.exports = { logAdminAction };
