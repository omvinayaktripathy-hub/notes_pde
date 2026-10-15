const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    rollNumber: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    section: {
        type: String,
        default: 'All',
        index: true
    },
    role: {
        type: String,
        enum: ['student', 'teacher', 'admin'],
        default: 'student',
        index: true
    },
    subjects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
    }],
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound Indexes for fast login and section-filtered queries
UserSchema.index({ rollNumber: 1, role: 1 });
UserSchema.index({ section: 1, role: 1 });

UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

UserSchema.methods.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', UserSchema);
