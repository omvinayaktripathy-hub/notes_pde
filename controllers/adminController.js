const User = require('../models/User');
const Subject = require('../models/Subject');
const Note = require('../models/Note');
const Notification = require('../models/Notification');
const Timetable = require('../models/Timetable');
const Result = require('../models/Result');
const AuditLog = require('../models/AuditLog');
const { logAdminAction } = require('../utils/auditLogger');
const { cache } = require('../utils/cache');

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

        // Fetch recent audit logs for security monitoring
        const auditLogs = await AuditLog.find().sort({ createdAt: -1 }).limit(25);

        res.render('admin/dashboard', {
            user: req.session.user,
            stats: {
                studentCount,
                teacherCount,
                subjectCount,
                noteCount,
                pendingDoubts,
                resultCount,
                auditLogCount: auditLogs.length
            },
            students,
            teachers,
            subjects,
            timetables,
            results,
            doubts,
            notes,
            auditLogs
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).render('error', { message: 'Failed to load admin dashboard.' });
    }
};

// Add Student with Audit Logging
exports.postAddStudent = async (req, res) => {
    try {
        const { rollNumber, name, password, section } = req.body;
        if (!rollNumber || !name || !password || !section) {
            req.session.errorMsg = 'All fields are required to register a student.';
            return res.redirect('/admin/dashboard#students-tab');
        }

        const normalizedRoll = String(rollNumber).trim().toUpperCase();
        const exists = await User.findOne({ rollNumber: normalizedRoll });
        if (exists) {
            req.session.errorMsg = `Roll Number ${normalizedRoll} already exists!`;
            return res.redirect('/admin/dashboard#students-tab');
        }

        const newStudent = new User({
            rollNumber: normalizedRoll,
            name: String(name).trim().substring(0, 100),
            password: String(password).trim(),
            section: String(section).trim().toUpperCase(),
            role: 'student'
        });

        await newStudent.save();

        await logAdminAction({
            req,
            action: 'ADD_STUDENT',
            targetType: 'User',
            targetId: newStudent._id,
            details: { rollNumber: newStudent.rollNumber, name: newStudent.name, section: newStudent.section }
        });

        req.session.successMsg = `Student ${newStudent.name} (${newStudent.rollNumber}) added!`;
        res.redirect('/admin/dashboard#students-tab');
    } catch (error) {
        console.error('Error adding student:', error);
        req.session.errorMsg = 'Failed to create student account.';
        res.redirect('/admin/dashboard#students-tab');
    }
};

// Delete Student with Audit Logging
exports.postDeleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            req.session.errorMsg = 'Invalid student ID.';
            return res.redirect('/admin/dashboard#students-tab');
        }

        const student = await User.findById(id);
        if (student) {
            await User.findByIdAndDelete(id);
            await logAdminAction({
                req,
                action: 'DELETE_STUDENT',
                targetType: 'User',
                targetId: id,
                details: { rollNumber: student.rollNumber, name: student.name }
            });
        }

        req.session.successMsg = 'Student account deleted.';
        res.redirect('/admin/dashboard#students-tab');
    } catch (error) {
        console.error('Error deleting student:', error);
        req.session.errorMsg = 'Error deleting student.';
        res.redirect('/admin/dashboard#students-tab');
    }
};

// Add Teacher with Audit Logging
exports.postAddTeacher = async (req, res) => {
    try {
        const { rollNumber, name, password } = req.body;
        if (!rollNumber || !name || !password) {
            req.session.errorMsg = 'Faculty ID, name, and password are required.';
            return res.redirect('/admin/dashboard#teachers-tab');
        }

        const normalizedId = String(rollNumber).trim().toUpperCase();
        const exists = await User.findOne({ rollNumber: normalizedId });
        if (exists) {
            req.session.errorMsg = `Faculty ID ${normalizedId} already exists!`;
            return res.redirect('/admin/dashboard#teachers-tab');
        }

        const newTeacher = new User({
            rollNumber: normalizedId,
            name: String(name).trim().substring(0, 100),
            password: String(password).trim(),
            section: 'All',
            role: 'teacher'
        });

        await newTeacher.save();

        await logAdminAction({
            req,
            action: 'ADD_TEACHER',
            targetType: 'User',
            targetId: newTeacher._id,
            details: { rollNumber: newTeacher.rollNumber, name: newTeacher.name }
        });

        req.session.successMsg = `Faculty member ${newTeacher.name} (${newTeacher.rollNumber}) added!`;
        res.redirect('/admin/dashboard#teachers-tab');
    } catch (error) {
        console.error('Error adding teacher:', error);
        req.session.errorMsg = 'Failed to create faculty account.';
        res.redirect('/admin/dashboard#teachers-tab');
    }
};

// Delete Teacher with Audit Logging
exports.postDeleteTeacher = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            req.session.errorMsg = 'Invalid teacher ID.';
            return res.redirect('/admin/dashboard#teachers-tab');
        }

        const teacher = await User.findById(id);
        if (teacher) {
            await User.findByIdAndDelete(id);
            await logAdminAction({
                req,
                action: 'DELETE_TEACHER',
                targetType: 'User',
                targetId: id,
                details: { rollNumber: teacher.rollNumber, name: teacher.name }
            });
        }

        req.session.successMsg = 'Faculty account deleted.';
        res.redirect('/admin/dashboard#teachers-tab');
    } catch (error) {
        console.error('Error deleting teacher:', error);
        req.session.errorMsg = 'Error deleting faculty account.';
        res.redirect('/admin/dashboard#teachers-tab');
    }
};

// Add Subject with Audit Logging
exports.postAddSubject = async (req, res) => {
    try {
        const { code, name, sections, teacherId } = req.body;
        if (!code || !name || !sections) {
            req.session.errorMsg = 'Code, name, and sections are required.';
            return res.redirect('/admin/dashboard#subjects-tab');
        }

        const normalizedCode = String(code).trim().toUpperCase();
        const exists = await Subject.findOne({ code: normalizedCode });
        if (exists) {
            req.session.errorMsg = `Subject code ${normalizedCode} already exists!`;
            return res.redirect('/admin/dashboard#subjects-tab');
        }

        const parsedSections = String(sections)
            .split(',')
            .map(s => s.trim().toUpperCase())
            .filter(Boolean);

        const newSubject = new Subject({
            code: normalizedCode,
            name: String(name).trim().substring(0, 100),
            sections: parsedSections,
            teacher: (teacherId && teacherId.match(/^[0-9a-fA-F]{24}$/)) ? teacherId : null
        });

        await newSubject.save();
        cache.delPattern('/api/subjects');
        cache.delPattern('/api/stats');

        await logAdminAction({
            req,
            action: 'ADD_SUBJECT',
            targetType: 'Subject',
            targetId: newSubject._id,
            details: { code: newSubject.code, name: newSubject.name }
        });

        req.session.successMsg = `Subject ${newSubject.code} created successfully!`;
        res.redirect('/admin/dashboard#subjects-tab');
    } catch (error) {
        console.error('Error creating subject:', error);
        req.session.errorMsg = 'Failed to create subject.';
        res.redirect('/admin/dashboard#subjects-tab');
    }
};

// Delete Subject with Audit Logging
exports.postDeleteSubject = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            req.session.errorMsg = 'Invalid subject ID.';
            return res.redirect('/admin/dashboard#subjects-tab');
        }

        const subject = await Subject.findById(id);
        if (subject) {
            await Subject.findByIdAndDelete(id);
            cache.delPattern('/api/subjects');
            cache.delPattern('/api/stats');
            await logAdminAction({
                req,
                action: 'DELETE_SUBJECT',
                targetType: 'Subject',
                targetId: id,
                details: { code: subject.code, name: subject.name }
            });
        }

        req.session.successMsg = 'Subject deleted.';
        res.redirect('/admin/dashboard#subjects-tab');
    } catch (error) {
        console.error('Error deleting subject:', error);
        req.session.errorMsg = 'Failed to delete subject.';
        res.redirect('/admin/dashboard#subjects-tab');
    }
};

// Add / Update Timetable Slot with Audit Logging
exports.postAddTimetableSlot = async (req, res) => {
    try {
        const { section, day, period, startTime, endTime, subjectId, teacherId, room } = req.body;
        if (!section || !day || !startTime || !endTime || !subjectId) {
            req.session.errorMsg = 'Section, day, timing, and subject are required.';
            return res.redirect('/admin/dashboard#timetable-tab');
        }

        const normalizedSection = String(section).trim().toUpperCase();
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
            startTime: String(startTime).trim().substring(0, 10),
            endTime: String(endTime).trim().substring(0, 10),
            subject: subjectId,
            teacher: (teacherId && teacherId.match(/^[0-9a-fA-F]{24}$/)) ? teacherId : null,
            room: room ? String(room).trim().substring(0, 50) : 'Lecture Hall 1'
        });

        timetable.slots.sort((a, b) => a.period - b.period);
        timetable.updatedAt = new Date();

        await timetable.save();

        await logAdminAction({
            req,
            action: 'ADD_TIMETABLE_SLOT',
            targetType: 'Timetable',
            targetId: timetable._id,
            details: { section: normalizedSection, day, period }
        });

        req.session.successMsg = `Schedule slot added for Section ${normalizedSection} on ${day}!`;
        res.redirect('/admin/dashboard#timetable-tab');
    } catch (error) {
        console.error('Error adding timetable slot:', error);
        req.session.errorMsg = 'Failed to save timetable slot.';
        res.redirect('/admin/dashboard#timetable-tab');
    }
};

// Delete Timetable with Audit Logging
exports.postDeleteTimetable = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            req.session.errorMsg = 'Invalid timetable ID.';
            return res.redirect('/admin/dashboard#timetable-tab');
        }

        const tt = await Timetable.findById(id);
        if (tt) {
            await Timetable.findByIdAndDelete(id);
            await logAdminAction({
                req,
                action: 'DELETE_TIMETABLE',
                targetType: 'Timetable',
                targetId: id,
                details: { section: tt.section, day: tt.day }
            });
        }

        req.session.successMsg = 'Timetable schedule deleted.';
        res.redirect('/admin/dashboard#timetable-tab');
    } catch (error) {
        console.error('Error deleting timetable:', error);
        req.session.errorMsg = 'Failed to delete timetable.';
        res.redirect('/admin/dashboard#timetable-tab');
    }
};

// Publish Result with Audit Logging
exports.postPublishResult = async (req, res) => {
    try {
        const { rollNumber, subjectId, examName, marksObtained, maxMarks, remarks } = req.body;
        if (!rollNumber || !subjectId || !examName) {
            req.session.errorMsg = 'Roll number, subject, and exam name are required.';
            return res.redirect('/admin/dashboard#results-tab');
        }

        const normalizedRoll = String(rollNumber).trim().toUpperCase();
        const student = await User.findOne({ rollNumber: normalizedRoll, role: 'student' });
        if (!student) {
            req.session.errorMsg = `No student found with Roll Number ${normalizedRoll}!`;
            return res.redirect('/admin/dashboard#results-tab');
        }

        const parsedMarks = parseFloat(marksObtained);
        const parsedMax = parseFloat(maxMarks) || 100;

        if (isNaN(parsedMarks) || parsedMarks < 0 || parsedMarks > parsedMax) {
            req.session.errorMsg = `Marks obtained must be between 0 and ${parsedMax}.`;
            return res.redirect('/admin/dashboard#results-tab');
        }

        const result = new Result({
            student: student._id,
            subject: subjectId,
            examName: String(examName).trim().substring(0, 100),
            marksObtained: parsedMarks,
            maxMarks: parsedMax,
            remarks: remarks ? String(remarks).trim().substring(0, 200) : 'Good',
            publishedBy: req.session.user.id
        });

        await result.save();

        await logAdminAction({
            req,
            action: 'PUBLISH_RESULT',
            targetType: 'Result',
            targetId: result._id,
            details: { studentRoll: student.rollNumber, exam: result.examName, marks: result.marksObtained }
        });

        req.session.successMsg = `Result published for ${student.name} (${student.rollNumber})!`;
        res.redirect('/admin/dashboard#results-tab');
    } catch (error) {
        console.error('Error publishing result:', error);
        req.session.errorMsg = 'Failed to publish examination result.';
        res.redirect('/admin/dashboard#results-tab');
    }
};

// Delete Result with Audit Logging
exports.postDeleteResult = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            req.session.errorMsg = 'Invalid result record ID.';
            return res.redirect('/admin/dashboard#results-tab');
        }

        const result = await Result.findById(id);
        if (result) {
            await Result.findByIdAndDelete(id);
            await logAdminAction({
                req,
                action: 'DELETE_RESULT',
                targetType: 'Result',
                targetId: id,
                details: { examName: result.examName, studentId: result.student }
            });
        }

        req.session.successMsg = 'Exam result record deleted.';
        res.redirect('/admin/dashboard#results-tab');
    } catch (error) {
        console.error('Error deleting result:', error);
        req.session.errorMsg = 'Failed to delete result record.';
        res.redirect('/admin/dashboard#results-tab');
    }
};
