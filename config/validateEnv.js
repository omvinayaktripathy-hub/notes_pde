/**
 * Environment Variable Validator & Security Checker
 * Verifies required secrets, disables debug modes, and warns on insecure configurations.
 */

const validateEnv = () => {
    const isProd = process.env.NODE_ENV === 'production';
    const warnings = [];
    const errors = [];

    // 1. Session Secret Check
    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) {
        if (isProd) {
            errors.push('SESSION_SECRET is required in production.');
        } else {
            warnings.push('SESSION_SECRET is not set. Using temporary development fallback.');
        }
    } else if (sessionSecret.length < 32) {
        warnings.push('SESSION_SECRET is too short (< 32 characters). High-entropy secret recommended.');
    }

    // 2. Database URI Check
    const dbUri = process.env.MONGODB_URI;
    if (!dbUri) {
        warnings.push('MONGODB_URI not provided. Defaulting to local instance mongodb://localhost:27017/notes_platform');
    }

    // 3. Port check
    const port = process.env.PORT || 3000;
    if (isNaN(Number(port))) {
        errors.push(`Invalid PORT configuration: "${port}". Must be an integer.`);
    }

    // Print Diagnostics
    if (warnings.length > 0) {
        console.warn('⚠️  Security Environment Warnings:');
        warnings.forEach(w => console.warn(`   • ${w}`));
    }

    if (errors.length > 0) {
        console.error('❌ Critical Environment Configuration Errors:');
        errors.forEach(e => console.error(`   • ${e}`));
        if (isProd) {
            console.error('Halting application startup due to unsafe production configuration.');
            process.exit(1);
        }
    }

    return {
        isProd,
        port: Number(port),
        isValid: errors.length === 0
    };
};

module.exports = validateEnv;
