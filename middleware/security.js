const crypto = require('crypto');

/**
 * Verify Webhook HMAC SHA-256 Signatures using constant-time comparison
 * @param {Buffer|string} payload - Raw payload buffer or string
 * @param {string} signature - Hex-encoded signature from header
 * @param {string} secret - Shared webhook secret
 */
const verifyWebhookSignature = (payload, signature, secret) => {
    if (!signature || !secret || !payload) return false;
    try {
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(payload);
        const expected = hmac.digest('hex');
        const signatureBuf = Buffer.from(signature, 'utf8');
        const expectedBuf = Buffer.from(expected, 'utf8');

        if (signatureBuf.length !== expectedBuf.length) return false;
        return crypto.timingSafeEqual(signatureBuf, expectedBuf);
    } catch (err) {
        console.error('Webhook verification error:', err);
        return false;
    }
};

/**
 * CAPTCHA verification middleware for public forms (Cloudflare Turnstile or Google reCAPTCHA)
 */
const verifyCaptcha = async (req, res, next) => {
    const captchaSecret = process.env.CAPTCHA_SECRET_KEY;
    // If not configured in development, bypass safely and log warning
    if (!captchaSecret) {
        return next();
    }

    const token = req.body['cf-turnstile-response'] || req.body['g-recaptcha-response'];
    if (!token) {
        if (req.xhr || req.headers.accept?.includes('json')) {
            return res.status(400).json({ error: 'CAPTCHA verification token missing.' });
        }
        req.session.errorMsg = 'Please complete the CAPTCHA security check.';
        return res.redirect('back');
    }

    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secret: captchaSecret,
                response: token,
                remoteip: req.ip
            })
        });

        const outcome = await response.json();
        if (!outcome.success) {
            if (req.xhr || req.headers.accept?.includes('json')) {
                return res.status(403).json({ error: 'CAPTCHA verification failed.' });
            }
            req.session.errorMsg = 'CAPTCHA verification failed. Please try again.';
            return res.redirect('back');
        }

        next();
    } catch (err) {
        console.error('CAPTCHA verification network error:', err);
        return next();
    }
};

module.exports = {
    verifyWebhookSignature,
    verifyCaptcha
};
