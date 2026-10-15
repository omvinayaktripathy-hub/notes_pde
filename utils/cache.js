/**
 * High-Performance In-Memory TTL Cache Engine
 * Provides instant sub-millisecond query responses and auto-eviction.
 */
class MemoryCache {
    constructor(defaultTtlSeconds = 60) {
        this.cache = new Map();
        this.defaultTtl = defaultTtlSeconds * 1000;
        this.stats = { hits: 0, misses: 0, sets: 0 };

        // Auto cleanup expired entries every 3 minutes
        setInterval(() => this.cleanup(), 3 * 60 * 1000).unref();
    }

    set(key, value, ttlSeconds = null) {
        const ttl = ttlSeconds !== null ? ttlSeconds * 1000 : this.defaultTtl;
        const expiresAt = Date.now() + ttl;
        this.cache.set(key, { value, expiresAt });
        this.stats.sets++;
    }

    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.stats.misses++;
            return null;
        }

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }

        this.stats.hits++;
        return entry.value;
    }

    del(key) {
        return this.cache.delete(key);
    }

    delPattern(prefix) {
        let count = 0;
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }

    flush() {
        this.cache.clear();
    }

    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }

    getStats() {
        return {
            ...this.stats,
            size: this.cache.size,
            hitRatio: this.stats.hits + this.stats.misses > 0 
                ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(1) + '%'
                : '0%'
        };
    }
}

const memoryCache = new MemoryCache(60); // 60s default TTL

/**
 * Express Middleware for caching GET API responses
 * @param {number} ttlSeconds - Duration in seconds to cache the response
 */
const cacheMiddleware = (ttlSeconds = 60) => {
    return (req, res, next) => {
        // Cache only GET requests
        if (req.method !== 'GET') return next();

        // Key based on path and sorted query params
        const queryKey = Object.keys(req.query).sort().map(k => `${k}=${req.query[k]}`).join('&');
        const userScope = req.session?.user ? `u:${req.session.user.id}:${req.session.user.role}:` : 'anon:';
        const cacheKey = `${userScope}${req.originalUrl || req.url}?${queryKey}`;

        const cached = memoryCache.get(cacheKey);
        if (cached) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(cached);
        }

        res.setHeader('X-Cache', 'MISS');

        // Override res.json to store in cache before sending
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                memoryCache.set(cacheKey, body, ttlSeconds);
            }
            return originalJson(body);
        };

        next();
    };
};

module.exports = {
    cache: memoryCache,
    cacheMiddleware
};
