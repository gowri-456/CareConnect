const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    profilePicture: user.profilePicture,
  };
}

async function register(req, res) {
  const { name, email, password, role, phone } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "Name, email and password are required." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    return res.status(400).json({ success: false, message: "An account with this email already exists." });
  }

  const allowedRoles = ["customer", "provider", "support_agent"];
  const userRole = allowedRoles.includes(role) ? role : "customer";
  const user = await User.create({
    name,
    email: normalizedEmail,
    password: await bcrypt.hash(password, 10),
    role: userRole,
    phone,
  });

  if (userRole === "provider") {
    try {
      const mongoose = require("mongoose");
      const db = mongoose.connection.db;
      if (db) {
        const now = new Date();
        await db.collection("providerprofiles").insertOne({
          _id: new mongoose.Types.ObjectId(),
          user: user._id,
          bio: `Verified home care and maintenance provider.`,
          skills: ["General Service"],
          serviceAreas: ["Colombo", "Western Province"],
          experienceYears: 2,
          hourlyRate: 1500,
          verificationStatus: "verified",
          ratingAvg: 5.0,
          ratingCount: 1,
          isAvailableForWork: true,
          location: {
            latitude: 6.9271,
            longitude: 79.8612,
          },
          documents: [],
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch (profErr) {
      console.warn("Could not create initial provider profile:", profErr.message);
    }
  }

  const token = generateToken(user);
  return res.status(201).json({ success: true, token, user: publicUser(user) });
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ success: false, message: "Invalid email or password." });
  }
  if (!user.isActive) {
    return res.status(403).json({ success: false, message: "Your account has been deactivated." });
  }

  const token = generateToken(user);
  return res.json({ success: true, token, user: publicUser(user) });
}

async function getMe(req, res) {
  return res.json({ success: true, user: publicUser(req.user) });
}

module.exports = { register, login, getMe };