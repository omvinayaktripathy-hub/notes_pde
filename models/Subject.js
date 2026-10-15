const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    sections: [{
        type: String,
        uppercase: true,
        trim: true
    }],
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    }
});

// Indexes for fast lookup by code, assigned teacher, and enrolled section
SubjectSchema.index({ code: 1 }, { unique: true });
SubjectSchema.index({ teacher: 1 });
SubjectSchema.index({ sections: 1 });

module.exports = mongoose.model('Subject', SubjectSchema);
