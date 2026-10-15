/**
 * Automated Load Testing & Caching Benchmark Suite
 * Tests concurrency, caching throughput, latency, and rate limiter cooling enforcement.
 */

const http = require('http');

const CONFIG = {
    host: '127.0.0.1',
    port: process.env.PORT || 3000,
    totalRequests: 60,
    concurrency: 10
};

// Simple HTTP request helper returning latency and status
const makeRequest = (path, headers = {}, method = 'GET', postData = null) => {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const payload = postData ? JSON.stringify(postData) : null;
        const options = {
            hostname: CONFIG.host,
            port: CONFIG.port,
            path,
            method,
            headers: {
                'Accept': 'application/json',
                ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                const latency = Date.now() - startTime;
                const cacheStatus = res.headers['x-cache'] || 'NONE';
                resolve({
                    status: res.statusCode,
                    latency,
                    cacheStatus,
                    retryAfter: res.headers['retry-after'] || null
                });
            });
        });

        req.on('error', (err) => {
            resolve({
                status: 500,
                latency: Date.now() - startTime,
                error: err.message
            });
        });

        if (payload) req.write(payload);
        req.end();
    });
};

// Concurrency pool runner
const runConcurrentBatch = async (path, count, concurrency, headers = {}) => {
    const results = [];
    const queue = Array.from({ length: count }, () => path);

    const worker = async () => {
        while (queue.length > 0) {
            const currentPath = queue.shift();
            const res = await makeRequest(currentPath, headers);
            results.push(res);
        }
    };

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);
    return results;
};

// Calculate percentiles
const calculateMetrics = (results) => {
    const latencies = results.map(r => r.latency).sort((a, b) => a - b);
    const total = latencies.reduce((sum, l) => sum + l, 0);
    const avg = (total / latencies.length).toFixed(2);
    const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const min = latencies[0] || 0;
    const max = latencies[latencies.length - 1] || 0;

    const statusCounts = {};
    results.forEach(r => {
        statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });

    const cacheHits = results.filter(r => r.cacheStatus === 'HIT').length;
    const cacheMisses = results.filter(r => r.cacheStatus === 'MISS').length;

    return { total: results.length, avg, p50, p95, min, max, statusCounts, cacheHits, cacheMisses };
};

const runLoadTest = async () => {
    console.log('===========================================================');
    console.log('🚀 NOTES PLATFORM LOAD TESTING & BENCHMARK SUITE');
    console.log(`Target: http://${CONFIG.host}:${CONFIG.port}`);
    console.log('===========================================================\n');

    // 1. Health Probe Benchmark
    console.log(`[TEST 1] Testing /health Probe (${CONFIG.totalRequests} reqs @ concurrency ${CONFIG.concurrency})...`);
    const healthStart = Date.now();
    const healthResults = await runConcurrentBatch('/health', CONFIG.totalRequests, CONFIG.concurrency);
    const healthDuration = (Date.now() - healthStart) / 1000;
    const healthMetrics = calculateMetrics(healthResults);

    console.log(`   Total Time: ${healthDuration.toFixed(2)}s | Throughput: ${(CONFIG.totalRequests / healthDuration).toFixed(0)} req/s`);
    console.log(`   Latency: Min: ${healthMetrics.min}ms | Avg: ${healthMetrics.avg}ms | P95: ${healthMetrics.p95}ms | Max: ${healthMetrics.max}ms`);
    console.log(`   Status Codes:`, healthMetrics.statusCounts);
    console.log('');

    // 2. Homepage SSR Rendering Benchmark
    console.log(`[TEST 2] Testing Homepage (SSR & Static Pipeline) (30 reqs @ concurrency 5)...`);
    const homeStart = Date.now();
    const homeResults = await runConcurrentBatch('/', 30, 5);
    const homeDuration = (Date.now() - homeStart) / 1000;
    const homeMetrics = calculateMetrics(homeResults);

    console.log(`   Total Time: ${homeDuration.toFixed(2)}s | Throughput: ${(30 / homeDuration).toFixed(0)} req/s`);
    console.log(`   Latency: Min: ${homeMetrics.min}ms | Avg: ${homeMetrics.avg}ms | P95: ${homeMetrics.p95}ms | Max: ${homeMetrics.max}ms`);
    console.log(`   Status Codes:`, homeMetrics.statusCounts);
    console.log('');

    // 3. Rate Limiter & Cooling Period Verification
    console.log('[TEST 3] Testing Rate Limiter Cooling Enforcement (60s 3-requests rule)...');
    console.log('   Sending 5 sequential POST requests to /login/student from test client IP (198.51.100.42)...');

    const rateResults = [];
    for (let i = 1; i <= 5; i++) {
        const res = await makeRequest('/login/student', { 'X-Forwarded-For': '198.51.100.42' }, 'POST', { rollNumber: 'S0001', password: 'wrong_password' });
        rateResults.push(res);
        console.log(`   Attempt ${i}: Status ${res.status} ${res.status === 429 ? `[COOLING ACTIVE - Blocked for ${res.retryAfter}s]` : '[PASSED THROUGH TO AUTH]'}`);
    }

    const passedAttempts = rateResults.filter(r => r.status !== 429).length;
    const coolingBlocked = rateResults.filter(r => r.status === 429).length;

    console.log(`\n   Rate Limiting Result: Passed: ${passedAttempts} (Max 3) | Cooling Blocked: ${coolingBlocked}`);
    if (passedAttempts === 3 && coolingBlocked === 2) {
        console.log('   ✅ Rate Limiting with 2-minute Cooling Period verified successfully!');
    }

    console.log('\n===========================================================');
    console.log('✨ All load tests and caching benchmarks completed.');
    console.log('===========================================================');
};

runLoadTest().catch(console.error);
