const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to:', process.env.MONGODB_URI);
        
        const totalUsers = await User.countDocuments();
        console.log('👥 Total users:', totalUsers);
        
        const s1 = await User.findOne({ rollNumber: 'S0001' });
        console.log('🔍 S0001 found?', s1 ? 'YES' : 'NO');
        if (s1) {
            console.log('   Name:', s1.name);
            console.log('   Role:', s1.role);
            console.log('   Section:', s1.section);
            console.log('   Password hash preview:', s1.password.substring(0, 30));
            
            // Test password
            const match = await s1.comparePassword('student123');
            console.log('   🔑 Password "student123" matches?', match ? 'YES ✅' : 'NO ❌');
        }
        
        const t1 = await User.findOne({ rollNumber: 'T001' });
        console.log('👨‍🏫 T001 found?', t1 ? 'YES' : 'NO');
        if (t1) {
            const match = await t1.comparePassword('teacher123');
            console.log('   🔑 Password "teacher123" matches?', match ? 'YES ✅' : 'NO ❌');
        }
        
        process.exit();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}
test();
