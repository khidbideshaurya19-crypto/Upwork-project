require('./firebase'); // Initialize Firestore
const Admin = require('./models/Admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const seedAdmin = async () => {
  try {
    console.log('🔥 Connecting to Firebase / Firestore...');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@upwork.com' });

    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists');
      console.log('\n📋 Admin Credentials:');
      console.log('   Email: admin@upwork.com');
      console.log('   Password: Admin@123456');
      return;
    }

    // Create super admin
    const admin = new Admin({
      name: 'Super Admin',
      email: 'admin@upwork.com',
      password: 'Admin@123456',
      role: 'super_admin',
      isActive: true,
      permissions: {
        manageUsers: true,
        manageProjects: true,
        manageDisputes: true,
        viewAnalytics: true,
        manageTransactions: true,
        systemSettings: true
      }
    });

    await admin.save();
    console.log('✅ Admin user created successfully!');
    console.log('\n📋 Admin Credentials:');
    console.log('   Email: admin@upwork.com');
    console.log('   Password: Admin@123456');
    console.log('\n🔐 Access Admin Panel: http://localhost:3002');

    // Create moderator admin
    const moderator = new Admin({
      name: 'Moderator',
      email: 'moderator@upwork.com',
      password: 'Moderator@123',
      role: 'moderator',
      isActive: true,
      permissions: {
        manageUsers: true,
        manageProjects: true,
        manageDisputes: true,
        viewAnalytics: false,
        manageTransactions: false,
        systemSettings: false
      }
    });

    await moderator.save();
    console.log('\n📋 Moderator Credentials:');
    console.log('   Email: moderator@upwork.com');
    console.log('   Password: Moderator@123');

    console.log('\n✅ Database seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
