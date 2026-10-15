const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/notes_platform';
        const isProd = process.env.NODE_ENV === 'production';

        const options = {
            // Connection Pool Configuration
            maxPoolSize: isProd ? 50 : 10,
            minPoolSize: isProd ? 10 : 2,
            
            // Timeouts & Resilience
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
            
            // Auto indexing (enabled in dev, set to false in high-throughput prod after manual migration)
            autoIndex: !isProd,
            
            // Write concern & retries
            retryWrites: true,
            w: 'majority'
        };

        const conn = await mongoose.connect(uri, options);

        console.log(`✅ MongoDB Connected: ${conn.connection.host} [Pool: ${options.maxPoolSize} max]`);

        // Connection event monitoring
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB Runtime Error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected. Attempting automatic reconnection...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('🔄 MongoDB reconnected successfully.');
        });

        return conn;
    } catch (error) {
        console.error(`❌ Critical MongoDB Connection Error: ${error.message}`);
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
};

module.exports = connectDB;
