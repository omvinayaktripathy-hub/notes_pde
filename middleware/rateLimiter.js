const rateLimit = require('express-rate-limit');

/**
 * Strict Rate Limiter with Cooling Period:
 * Rule: 3 requests allowed per 60 seconds.
 * If exceeded, a 2-minute (120 seconds) cooling period is enforced before requests are accepted again.
 */
class CoolingRateLimiter {
    constructor({ windowMs = 60 * 1000, maxRequests = 3, coolingMs = 2 * 60 * 1000 }) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
        this.coolingMs = coolingMs;
        this.clients = new Map();

        // Memory cleanup every 5 minutes
        setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
    }

    getClientKey(req) {
        return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
               req.socket?.remoteAddress || 
               req.ip || 
               'unknown_ip';
    }

    cleanup() {
        const now = Date.now();
        for (const [key, record] of this.clients.entries()) {
            if (record.coolingUntil && now > record.coolingUntil) {
                this.clients.delete(key);
            } else if (now - record.firstRequest > this.windowMs && !record.coolingUntil) {
                this.clients.delete(key);
            }
        }
    }

    middleware() {
        return (req, res, next) => {
            const key = this.getClientKey(req);
            const now = Date.now();
            let record = this.clients.get(key);

            // If client is currently under cooling period
            if (record && record.coolingUntil) {
                if (now < record.coolingUntil) {
                    const remainingSeconds = Math.ceil((record.coolingUntil - now) / 1000);
                    res.setHeader('Retry-After', remainingSeconds);

                    const errorText = `Rate limit exceeded (3 requests per 60 seconds). A 2-minute cooling period is active. Please wait ${remainingSeconds} second(s) before trying again.`;

                    if (req.xhr || req.headers.accept?.includes('application/json') || req.path.startsWith('/api')) {
                        return res.status(429).json({
                            error: errorText,
                            coolingPeriodSeconds: remainingSeconds
                        });
                    }

                    if (req.session) {
                        req.session.errorMsg = errorText;
                    }
                    return res.status(429).render('error', {
                        statusCode: 429,
                        title: 'Rate Limit Cooling Active',
                        message: errorText
                    });
                } else {
                    // Cooling period has expired, reset record
                    record = null;
                    this.clients.delete(key);
                }
            }

            // If no record exists or window expired, initialize new window
            if (!record || (now - record.firstRequest > this.windowMs)) {
                this.clients.set(key, {
                    firstRequest: now,
                    count: 1,
                    coolingUntil: null
                });
                return next();
            }

            // Increment request count within 60s window
            record.count += 1;

            if (record.count > this.maxRequests) {
                // Exceeded 3 requests within 60 seconds -> Activate 2-minute cooling period
                record.coolingUntil = now + this.coolingMs;
                const remainingSeconds = Math.ceil(this.coolingMs / 1000);
                res.setHeader('Retry-After', remainingSeconds);

                const errorText = `Rate limit exceeded (Max 3 requests per 60 seconds). A 2-minute cooling period has been initiated. Please wait ${remainingSeconds} seconds.`;

                if (req.xhr || req.headers.accept?.includes('application/json') || req.path.startsWith('/api')) {
                    return res.status(429).json({
                        error: errorText,
                        coolingPeriodSeconds: remainingSeconds
                    });
                }

                if (req.session) {
                    req.session.errorMsg = errorText;
                }
                return res.status(429).render('error', {
                    statusCode: 429,
                    title: 'Rate Limit Cooling Active',
                    message: errorText
                });
            }

            return next();
        };
    }
}

// 60 sec 3 times only then 2 minutes cooling period
const strictCoolingAuthLimiter = new CoolingRateLimiter({
    windowMs: 60 * 1000,        // 60 seconds
    maxRequests: 3,             // 3 times only
    coolingMs: 2 * 60 * 1000    // 2 minutes cooling period
}).middleware();

// General API request limiter
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'API rate limit exceeded. Please throttle requests.' }
});

// Global page load limiter
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Global rate limit reached.' }
});

// File upload rate limiter
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        req.session.errorMsg = 'Upload limit reached (Max 30 uploads/hour).';
        res.redirect('back');
    }
});

module.exports = {
    globalLimiter,
    authLimiter: strictCoolingAuthLimiter,
    apiLimiter,
    uploadLimiter,
    CoolingRateLimiter
};
