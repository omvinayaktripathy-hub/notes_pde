const mongoose = require('mongoose');
const User = require('./models/User');
const Timetable = require('./models/Timetable');
const Result = require('./models/Result');
require('dotenv').config();

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to:', process.env.MONGODB_URI);

        const totalUsers = await User.countDocuments();
        console.log('👥 Total users:', totalUsers);

        const admin = await User.findOne({ rollNumber: 'ADMIN01' });
        console.log('🛡️ Admin found?', admin ? 'YES' : 'NO');
        if (admin) {
            const match = await admin.comparePassword('admin123');
            console.log('   🔑 Password "admin123" matches?', match ? 'YES ✅' : 'NO ❌');
        }

        const s1 = await User.findOne({ rollNumber: 'S0001' });
        console.log('🔍 S0001 found?', s1 ? 'YES' : 'NO');
        if (s1) {
            const match = await s1.comparePassword('student123');
            console.log('   🔑 Password "student123" matches?', match ? 'YES ✅' : 'NO ❌');
        }

        const t1 = await User.findOne({ rollNumber: 'T001' });
        console.log('👨‍🏫 T001 found?', t1 ? 'YES' : 'NO');
        if (t1) {
            const match = await t1.comparePassword('teacher123');
            console.log('   🔑 Password "teacher123" matches?', match ? 'YES ✅' : 'NO ❌');
        }

        const timetablesCount = await Timetable.countDocuments();
        console.log('📅 Timetables count:', timetablesCount);

        const resultsCount = await Result.countDocuments();
        console.log('📊 Results count:', resultsCount);

        process.exit();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}
test();
