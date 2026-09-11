const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    sections: [{
        type: String
    }],
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

module.exports = mongoose.model('Subject', SubjectSchema);
