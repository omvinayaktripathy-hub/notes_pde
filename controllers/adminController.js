const User = require('../models/User');
const Subject = require('../models/Subject');
const Note = require('../models/Note');
const Notification = require('../models/Notification');
const Timetable = require('../models/Timetable');
const Result = require('../models/Result');
const bcrypt = require('bcryptjs');

// Admin Dashboard
exports.getDashboard = async (req, res) => {
    try {
        const studentCount = await User.countDocuments({ role: 'student' });
        const teacherCount = await User.countDocuments({ role: 'teacher' });
        const subjectCount = await Subject.countDocuments();
        const noteCount = await Note.countDocuments();
        const pendingDoubts = await Notification.countDocuments({ status: 'pending' });
        const resultCount = await Result.countDocuments();

        // Fetch lists for administration
        const students = await User.find({ role: 'student' }).sort({ rollNumber: 1 }).limit(100);
        const teachers = await User.find({ role: 'teacher' }).sort({ rollNumber: 1 });
        const subjects = await Subject.find().populate('teacher', 'name rollNumber').sort({ code: 1 });
        const timetables = await Timetable.find()
            .populate('slots.subject', 'code name')
            .populate('slots.teacher', 'name')
            .sort({ section: 1, day: 1 });
        const results = await Result.find()
            .populate('student', 'name rollNumber section')
            .populate('subject', 'code name')
            .sort({ publishedAt: -1 })
            .limit(100);
        const doubts = await Notification.find()
            .populate('student', 'name rollNumber')
            .populate('subject', 'code name')
            .sort({ createdAt: -1 })
            .limit(50);
        const notes = await Note.find()
            .populate('subject', 'code name')
            .populate('uploadedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(50);

        res.render('admin/dashboard', {
            user: req.session.user,
            stats: {
                studentCount,
                teacherCount,
                subjectCount,
                noteCount,
                pendingDoubts,
                resultCount
            },
            students,
            teachers,
            subjects,
            timetables,
            results,
            doubts,
            notes
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).render('error', { message: 'Failed to load admin dashboard.' });
    }
};

// Add Student
exports.postAddStudent = async (req, res) => {
    try {
        const { rollNumber, name, password, section } = req.body;
        const normalizedRoll = rollNumber.trim().toUpperCase();

        const exists = await User.findOne({ rollNumber: normalizedRoll });
        if (exists) {
            req.session.errorMsg = `Roll Number ${normalizedRoll} already exists!`;
            return res.redirect('/admin/dashboard#students-tab');
        }

        const newStudent = new User({
            rollNumber: normalizedRoll,
            name: name.trim(),
            password: password.trim(),
            section: section.trim().toUpperCase(),
            role: 'student'
        });

        await newStudent.save();
        req.session.successMsg = `Student ${newStudent.name} (${newStudent.rollNumber}) added!`;
        res.redirect('/admin/dashboard#students-tab');
    } catch (error) {
        console.error('Error adding student:', error);
        req.session.errorMsg = 'Failed to create student account.';
        res.redirect('/admin/dashboard#students-tab');
    }
};

// Delete Student
exports.postDeleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        req.session.successMsg = 'Student account deleted.';
        res.redirect('/admin/dashboard#students-tab');
    } catch (error) {
        req.session.errorMsg = 'Error deleting student.';
        res.redirect('/admin/dashboard#students-tab');
    }
};

// Add Teacher
exports.postAddTeacher = async (req, res) => {
    try {
        const { rollNumber, name, password } = req.body;
        const normalizedId = rollNumber.trim().toUpperCase();

        const exists = await User.findOne({ rollNumber: normalizedId });
        if (exists) {
            req.session.errorMsg = `Faculty ID ${normalizedId} already exists!`;
            return res.redirect('/admin/dashboard#teachers-tab');
        }

        const newTeacher = new User({
            rollNumber: normalizedId,
            name: name.trim(),
            password: password.trim(),
            section: 'All',
            role: 'teacher'
        });

        await newTeacher.save();
        req.session.successMsg = `Faculty member ${newTeacher.name} (${newTeacher.rollNumber}) added!`;
        res.redirect('/admin/dashboard#teachers-tab');
    } catch (error) {
        console.error('Error adding teacher:', error);
        req.session.errorMsg = 'Failed to create faculty account.';
        res.redirect('/admin/dashboard#teachers-tab');
    }
};

// Delete Teacher
exports.postDeleteTeacher = async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        req.session.successMsg = 'Faculty account deleted.';
        res.redirect('/admin/dashboard#teachers-tab');
    } catch (error) {
        req.session.errorMsg = 'Error deleting faculty account.';
        res.redirect('/admin/dashboard#teachers-tab');
    }
};

// Add Subject
exports.postAddSubject = async (req, res) => {
    try {
        const { code, name, sections, teacherId } = req.body;
        const normalizedCode = code.trim().toUpperCase();

        const exists = await Subject.findOne({ code: normalizedCode });
        if (exists) {
            req.session.errorMsg = `Subject code ${normalizedCode} already exists!`;
            return res.redirect('/admin/dashboard#subjects-tab');
        }

        const parsedSections = sections
            .split(',')
            .map(s => s.trim().toUpperCase())
            .filter(Boolean);

        const newSubject = new Subject({
            code: normalizedCode,
            name: name.trim(),
            sections: parsedSections,
            teacher: teacherId || null
        });

        await newSubject.save();
        req.session.successMsg = `Subject ${newSubject.code} created successfully!`;
        res.redirect('/admin/dashboard#subjects-tab');
    } catch (error) {
        console.error('Error creating subject:', error);
        req.session.errorMsg = 'Failed to create subject.';
        res.redirect('/admin/dashboard#subjects-tab');
    }
};

// Delete Subject
exports.postDeleteSubject = async (req, res) => {
    try {
        const { id } = req.params;
        await Subject.findByIdAndDelete(id);
        req.session.successMsg = 'Subject deleted.';
        res.redirect('/admin/dashboard#subjects-tab');
    } catch (error) {
        req.session.errorMsg = 'Failed to delete subject.';
        res.redirect('/admin/dashboard#subjects-tab');
    }
};

// Add / Update Timetable Slot
exports.postAddTimetableSlot = async (req, res) => {
    try {
        const { section, day, period, startTime, endTime, subjectId, teacherId, room } = req.body;

        const normalizedSection = section.trim().toUpperCase();
        let timetable = await Timetable.findOne({ section: normalizedSection, day });

        if (!timetable) {
            timetable = new Timetable({
                section: normalizedSection,
                day,
                slots: []
            });
        }

        timetable.slots.push({
            period: parseInt(period) || 1,
            startTime: startTime.trim(),
            endTime: endTime.trim(),
            subject: subjectId,
            teacher: teacherId || null,
            room: room ? room.trim() : 'Lecture Hall 1'
        });

        // Sort slots by period
        timetable.slots.sort((a, b) => a.period - b.period);
        timetable.updatedAt = new Date();

        await timetable.save();
        req.session.successMsg = `Schedule slot added for Section ${normalizedSection} on ${day}!`;
        res.redirect('/admin/dashboard#timetable-tab');
    } catch (error) {
        console.error('Error adding timetable slot:', error);
        req.session.errorMsg = 'Failed to save timetable slot.';
        res.redirect('/admin/dashboard#timetable-tab');
    }
};

// Delete Timetable Document or Slot
exports.postDeleteTimetable = async (req, res) => {
    try {
        const { id } = req.params;
        await Timetable.findByIdAndDelete(id);
        req.session.successMsg = 'Timetable schedule deleted.';
        res.redirect('/admin/dashboard#timetable-tab');
    } catch (error) {
        req.session.errorMsg = 'Failed to delete timetable.';
        res.redirect('/admin/dashboard#timetable-tab');
    }
};

// Publish / Add Result
exports.postPublishResult = async (req, res) => {
    try {
        const { rollNumber, subjectId, examName, marksObtained, maxMarks, remarks } = req.body;
        const normalizedRoll = rollNumber.trim().toUpperCase();

        const student = await User.findOne({ rollNumber: normalizedRoll, role: 'student' });
        if (!student) {
            req.session.errorMsg = `No student found with Roll Number ${normalizedRoll}!`;
            return res.redirect('/admin/dashboard#results-tab');
        }

        const result = new Result({
            student: student._id,
            subject: subjectId,
            examName: examName.trim(),
            marksObtained: parseFloat(marksObtained),
            maxMarks: parseFloat(maxMarks) || 100,
            remarks: remarks ? remarks.trim() : 'Good',
            publishedBy: req.session.user.id
        });

        await result.save();
        req.session.successMsg = `Result published for ${student.name} (${student.rollNumber})!`;
        res.redirect('/admin/dashboard#results-tab');
    } catch (error) {
        console.error('Error publishing result:', error);
        req.session.errorMsg = 'Failed to publish examination result.';
        res.redirect('/admin/dashboard#results-tab');
    }
};

// Delete Result
exports.postDeleteResult = async (req, res) => {
    try {
        const { id } = req.params;
        await Result.findByIdAndDelete(id);
        req.session.successMsg = 'Exam result record deleted.';
        res.redirect('/admin/dashboard#results-tab');
    } catch (error) {
        req.session.errorMsg = 'Failed to delete result record.';
        res.redirect('/admin/dashboard#results-tab');
    }
};
