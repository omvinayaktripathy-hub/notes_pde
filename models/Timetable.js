const mongoose = require('mongoose');

const SlotSchema = new mongoose.Schema({
    period: {
        type: Number,
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    room: {
        type: String,
        default: 'Lecture Hall 1'
    }
});

const TimetableSchema = new mongoose.Schema({
    section: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },
    day: {
        type: String,
        required: true,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    },
    slots: [SlotSchema],
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure a single timetable document per section and day
TimetableSchema.index({ section: 1, day: 1 }, { unique: true });

module.exports = mongoose.model('Timetable', TimetableSchema);
