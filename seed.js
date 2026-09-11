const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Subject = require('./models/Subject');
require('dotenv').config();

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/notes_platform');
        console.log('Connected to MongoDB');
        
        // Clear existing data
        await User.deleteMany({});
        await Subject.deleteMany({});
        
        // Create teacher (save() triggers pre-save hook -> hashes password)
        const teacher = new User({
            rollNumber: 'T001',
            name: 'Dr. Smith',
            password: 'teacher123',
            section: 'All',
            role: 'teacher'
        });
        await teacher.save();
        console.log('Teacher created');

        // Hash student password ONCE (all students share same password)
        const hashedStudentPassword = await bcrypt.hash('student123', 10);
        console.log('Password hashed');

        // Create 3000 students with PRE-HASHED password
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
        console.log('3000 Students created');

        // Create 30 subjects
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
        await Subject.insertMany(subjects);
        console.log('30 Subjects created');

        // Assign subjects to students (each student gets 5 random subjects)
        const allSubjects = await Subject.find({});
        const allStudents = await User.find({ role: 'student' });
        
        for (const student of allStudents) {
            const shuffled = [...allSubjects].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 5);
            student.subjects = selected.map(s => s._id);
            await student.save();
        }
        console.log('Subjects assigned to students');

        console.log('Database seeded successfully!');
        process.exit();
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}

seedDatabase();
