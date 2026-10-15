const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
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
    examName: {
        type: String,
        required: true,
        trim: true
    },
    marksObtained: {
        type: Number,
        required: true,
        min: 0
    },
    maxMarks: {
        type: Number,
        default: 100,
        min: 1
    },
    grade: {
        type: String,
        trim: true
    },
    remarks: {
        type: String,
        default: 'Passed'
    },
    publishedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    publishedAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Indexes for fast grade lookups
ResultSchema.index({ student: 1, subject: 1 });
ResultSchema.index({ publishedBy: 1, publishedAt: -1 });
ResultSchema.index({ student: 1, publishedAt: -1 });

// Auto-calculate grade before saving if not provided
ResultSchema.pre('save', function(next) {
    if (!this.grade) {
        const percentage = (this.marksObtained / this.maxMarks) * 100;
        if (percentage >= 90) this.grade = 'A+';
        else if (percentage >= 80) this.grade = 'A';
        else if (percentage >= 70) this.grade = 'B';
        else if (percentage >= 60) this.grade = 'C';
        else if (percentage >= 50) this.grade = 'D';
        else this.grade = 'F';
    }
    next();
});

module.exports = mongoose.model('Result', ResultSchema);
