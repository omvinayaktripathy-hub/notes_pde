const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Subject = require('./models/Subject');
const Timetable = require('./models/Timetable');
const Result = require('./models/Result');
require('dotenv').config();

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/notes_platform');
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Subject.deleteMany({});
        await Timetable.deleteMany({});
        await Result.deleteMany({});

        // 1. Create Super Admin
        const admin = new User({
            rollNumber: 'ADMIN01',
            name: 'Master Administrator',
            password: 'admin123',
            section: 'All',
            role: 'admin'
        });
        await admin.save();
        console.log('🛡️ Admin created (ID: ADMIN01 / Pass: admin123)');

        // 2. Create Teacher
        const teacher = new User({
            rollNumber: 'T001',
            name: 'Dr. Smith',
            password: 'teacher123',
            section: 'All',
            role: 'teacher'
        });
        await teacher.save();
        console.log('👨‍🏫 Teacher created (ID: T001 / Pass: teacher123)');

        // 3. Hash student password ONCE
        const hashedStudentPassword = await bcrypt.hash('student123', 10);

        // 4. Create 3000 students
        const sections = ['A', 'B', 'C', 'D', 'E'];
        const students = [];
        for (let i = 1; i <= 3000; i++) {
            const sectionIndex = Math.floor((i - 1) / 600) % sections.length;
            const section = sections[sectionIndex];
            students.push({
                rollNumber: `S${String(i).padStart(4, '0')}`,
                name: `Student ${i}`,
                password: hashedStudentPassword,
                section: section,
                role: 'student'
            });
        }
        await User.insertMany(students);
        console.log('👥 3000 Students created');

        // 5. Create 30 subjects
        const subjectNames = [
            'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
            'English Literature', 'History', 'Geography', 'Economics', 'Business Studies',
            'Accounting', 'Marketing', 'Finance', 'Human Resources', 'Operations Management',
            'Statistics', 'Data Science', 'Artificial Intelligence', 'Machine Learning', 'Web Development',
            'Database Systems', 'Network Security', 'Software Engineering', 'Programming Fundamentals', 'Data Structures',
            'Algorithms', 'Operating Systems', 'Computer Architecture', 'Digital Logic', 'Discrete Mathematics'
        ];

        const subjects = [];
        for (let i = 0; i < 30; i++) {
            subjects.push({
                code: `CS${String(i + 1).padStart(3, '0')}`,
                name: subjectNames[i],
                sections: ['A', 'B', 'C', 'D', 'E'],
                teacher: teacher._id
            });
        }
        const createdSubjects = await Subject.insertMany(subjects);
        console.log('📚 30 Subjects created');

        // 6. Assign subjects to students
        const allStudents = await User.find({ role: 'student' }).limit(50);
        for (const student of allStudents) {
            const shuffled = [...createdSubjects].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 5);
            student.subjects = selected.map(s => s._id);
            await student.save();
        }
        console.log('🎓 Enrolled sample students in 5 subjects');

        // 7. Create Timetables for sections A-E
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const periods = [
            { period: 1, startTime: '09:00 AM', endTime: '10:00 AM', room: 'Hall 101' },
            { period: 2, startTime: '10:00 AM', endTime: '11:00 AM', room: 'Hall 102' },
            { period: 3, startTime: '11:15 AM', endTime: '12:15 PM', room: 'CS Lab 1' },
            { period: 4, startTime: '01:00 PM', endTime: '02:00 PM', room: 'Hall 205' },
            { period: 5, startTime: '02:00 PM', endTime: '03:00 PM', room: 'CS Lab 2' }
        ];

        for (const sec of sections) {
            for (let d = 0; d < days.length; d++) {
                const day = days[d];
                const slots = periods.map((p, idx) => ({
                    period: p.period,
                    startTime: p.startTime,
                    endTime: p.endTime,
                    room: p.room,
                    subject: createdSubjects[(d * 5 + idx) % createdSubjects.length]._id,
                    teacher: teacher._id
                }));

                await Timetable.create({
                    section: sec,
                    day: day,
                    slots: slots
                });
            }
        }
        console.log('📅 Timetables generated for all 5 sections across Monday-Friday');

        // 8. Create sample Results for S0001
        const s1 = await User.findOne({ rollNumber: 'S0001' }).populate('subjects');
        if (s1 && s1.subjects) {
            const sampleScores = [92, 85, 78, 88, 94];
            for (let i = 0; i < s1.subjects.length; i++) {
                const sub = s1.subjects[i];
                const score = sampleScores[i % sampleScores.length];
                await Result.create({
                    student: s1._id,
                    subject: sub._id,
                    examName: 'Mid-Term Examination 2026',
                    marksObtained: score,
                    maxMarks: 100,
                    remarks: score >= 90 ? 'Outstanding academic excellence' : 'Very good conceptual grasp',
                    publishedBy: teacher._id
                });
            }
            console.log('📊 Generated sample exam results for S0001');
        }

        console.log('\n🚀 Database seeded successfully with Admin, Timetables, and Results!');
        process.exit();
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}

seedDatabase();
