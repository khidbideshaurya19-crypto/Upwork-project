require("dotenv").config();
const bcrypt = require("bcryptjs");
const { db } = require("./firebase");

const seedAdmin = async () => {
  try {
    const email = "admin@upwork.com";
    const password = "Admin@123";
    const name = "Super Admin";

    const existing = await db.collection("admins").where("email", "==", email).limit(1).get();
    if (!existing.empty) {
      console.log("Admin already exists:", email);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();

    const adminData = {
      name,
      email,
      password: hashedPassword,
      role: "super_admin",
      permissions: {
        manageUsers: true,
        manageProjects: true,
        manageDisputes: true,
        viewAnalytics: true,
        manageTransactions: true,
        systemSettings: true
      },
      isActive: true,
      lastLogin: null,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await db.collection("admins").add(adminData);
    console.log("Admin seeded successfully!");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("Firestore ID:", docRef.id);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();
