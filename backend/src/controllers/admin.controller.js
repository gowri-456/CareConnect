const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

function parseObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

/**
 * List all service providers with their individual earnings and performance stats.
 */
async function getProviders(req, res, next) {
  try {
    const db = mongoose.connection.db;

    // Fetch all users with role 'provider'
    const providerUsers = await db
      .collection("users")
      .find({ role: "provider" }, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    const providerUserIds = providerUsers.map((u) => u._id);

    // Fetch profiles for all providers
    const profiles = await db
      .collection("providerprofiles")
      .find({ user: { $in: providerUserIds } })
      .toArray();

    const profileMap = new Map(profiles.map((p) => [String(p.user), p]));
    const profileIds = profiles.map((p) => p._id);

    // Fetch all bookings for these provider profiles
    const bookings = profileIds.length
      ? await db
          .collection("bookings")
          .find({ provider: { $in: profileIds } })
          .toArray()
      : [];

    const bookingsByProfile = new Map();
    const bookingIds = bookings.map((b) => b._id);
    for (const b of bookings) {
      const key = String(b.provider);
      if (!bookingsByProfile.has(key)) bookingsByProfile.set(key, []);
      bookingsByProfile.get(key).push(b._id);
    }

    // Fetch all service requests assigned to these providers
    const serviceRequests = await db
      .collection("servicerequests")
      .find({ provider: { $in: providerUserIds } })
      .toArray();

    const requestsByProvider = new Map();
    const requestIds = serviceRequests.map((r) => r._id);
    for (const r of serviceRequests) {
      const key = String(r.provider);
      if (!requestsByProvider.has(key)) requestsByProvider.set(key, []);
      requestsByProvider.get(key).push(r._id);
    }

    // Fetch all invoices related to these providers (direct, by booking, or by request)
    const invoices = await db
      .collection("invoices")
      .find({
        $or: [
          { provider: { $in: providerUserIds } },
          { booking: { $in: bookingIds } },
          { request: { $in: requestIds } },
        ],
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Map customers for names on invoices
    const customerIds = invoices.map((inv) => inv.customer || inv.paidBy).filter(Boolean);
    const customers = customerIds.length
      ? await db.collection("users").find({ _id: { $in: customerIds } }, { projection: { name: 1, email: 1 } }).toArray()
      : [];
    const customerNameMap = new Map(customers.map((c) => [String(c._id), c.name]));

    // Group invoices by provider user ID
    const invoicesByProviderUser = new Map();
    for (const inv of invoices) {
      let matchedUserId = null;
      if (inv.provider) {
        matchedUserId = String(inv.provider);
      } else if (inv.booking) {
        const foundBooking = bookings.find((b) => String(b._id) === String(inv.booking));
        if (foundBooking) {
          const foundProfile = profiles.find((p) => String(p._id) === String(foundBooking.provider));
          if (foundProfile) matchedUserId = String(foundProfile.user);
        }
      } else if (inv.request) {
        const foundReq = serviceRequests.find((r) => String(r._id) === String(inv.request));
        if (foundReq) matchedUserId = String(foundReq.provider);
      }

      if (matchedUserId) {
        if (!invoicesByProviderUser.has(matchedUserId)) invoicesByProviderUser.set(matchedUserId, []);
        invoicesByProviderUser.get(matchedUserId).push({
          id: String(inv._id),
          reference: `INV-${String(inv._id).slice(-6).toUpperCase()}`,
          total: Number(inv.total || 0),
          providerAmount: Number(inv.providerAmount || inv.total || 0),
          status: inv.status || "pending",
          paymentMethod: inv.paymentMethod || "Not recorded",
          customerName: customerNameMap.get(String(inv.customer || inv.paidBy)) || "Customer",
          paidAt: inv.paidAt || null,
          createdAt: inv.createdAt || inv.updatedAt || null,
        });
      }
    }

    // Build comprehensive provider list with individual earnings
    let totalPlatformEarnings = 0;

    const data = providerUsers.map((user) => {
      const userIdStr = String(user._id);
      const profile = profileMap.get(userIdStr) || null;
      const userInvoices = invoicesByProviderUser.get(userIdStr) || [];

      const paidInvoices = userInvoices.filter((inv) => inv.status === "paid");
      const pendingInvoices = userInvoices.filter((inv) => inv.status !== "paid");

      const totalEarned = paidInvoices.reduce((sum, inv) => sum + inv.providerAmount, 0);
      const pendingEarnings = pendingInvoices.reduce((sum, inv) => sum + inv.providerAmount, 0);

      totalPlatformEarnings += totalEarned;

      const userReqs = requestsByProvider.get(userIdStr) || [];
      const userProfileBookings = profile ? (bookingsByProfile.get(String(profile._id)) || []) : [];

      return {
        id: userIdStr,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        isActive: user.isActive !== false,
        createdAt: user.createdAt,
        profile: profile
          ? {
              id: String(profile._id),
              bio: profile.bio || "",
              skills: Array.isArray(profile.skills) ? profile.skills : [],
              serviceAreas: Array.isArray(profile.serviceAreas) ? profile.serviceAreas : [],
              hourlyRate: Number(profile.hourlyRate || 0),
              experienceYears: Number(profile.experienceYears || 0),
              verificationStatus: profile.verificationStatus || "unverified",
              ratingAvg: Number(profile.ratingAvg || 0),
              ratingCount: Number(profile.ratingCount || 0),
            }
          : null,
        earnings: {
          totalEarned,
          pendingEarnings,
          paidTasksCount: paidInvoices.length,
          pendingTasksCount: pendingInvoices.length,
          totalAssignedTasks: userReqs.length + userProfileBookings.length,
        },
        invoices: userInvoices,
      };
    });

    return res.json({
      success: true,
      summary: {
        totalProviders: providerUsers.length,
        activeProviders: providerUsers.filter((u) => u.isActive !== false).length,
        totalPlatformEarnings,
      },
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Add a new service provider (Creates user + provider profile).
 */
async function createProvider(req, res, next) {
  try {
    const {
      name,
      email,
      password,
      phone,
      skills,
      serviceAreas,
      hourlyRate,
      experienceYears,
      bio,
      city,
    } = req.body || {};

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ success: false, message: "Name, email and password are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: "An account with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    const now = new Date();

    // Parse skills array
    let parsedSkills = [];
    if (Array.isArray(skills)) {
      parsedSkills = skills.map((s) => String(s).trim()).filter(Boolean);
    } else if (typeof skills === "string" && skills.trim()) {
      parsedSkills = skills.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (!parsedSkills.length) parsedSkills = ["General Service"];

    // Parse service areas array
    let parsedAreas = [];
    if (Array.isArray(serviceAreas)) {
      parsedAreas = serviceAreas.map((a) => String(a).trim()).filter(Boolean);
    } else if (typeof serviceAreas === "string" && serviceAreas.trim()) {
      parsedAreas = serviceAreas.split(",").map((a) => a.trim()).filter(Boolean);
    } else if (city?.trim()) {
      parsedAreas = [city.trim()];
    }
    if (!parsedAreas.length) parsedAreas = ["All areas"];

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "provider",
      phone: phone?.trim() || "",
      isVerified: true,
      isActive: true,
    });

    // Create provider profile in database
    const db = mongoose.connection.db;
    const profileId = new mongoose.Types.ObjectId();
    const profileDoc = {
      _id: profileId,
      user: user._id,
      bio: bio?.trim() || `Experienced provider in ${parsedSkills.join(", ")}.`,
      skills: parsedSkills,
      serviceAreas: parsedAreas,
      experienceYears: Number(experienceYears) || 2,
      hourlyRate: Number(hourlyRate) || 1200,
      verificationStatus: "verified",
      ratingAvg: 5.0,
      ratingCount: 1,
      isAvailableForWork: true,
      documents: [],
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("providerprofiles").insertOne(profileDoc);

    return res.status(201).json({
      success: true,
      message: `Service provider '${user.name}' was created successfully.`,
      data: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        skills: parsedSkills,
        serviceAreas: parsedAreas,
        hourlyRate: profileDoc.hourlyRate,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Delete a service provider.
 */
async function deleteProvider(req, res, next) {
  try {
    const providerId = parseObjectId(req.params.id);
    if (!providerId) return res.status(400).json({ success: false, message: "Invalid provider ID." });

    const db = mongoose.connection.db;
    const user = await db.collection("users").findOne({ _id: providerId, role: "provider" });
    if (!user) {
      return res.status(404).json({ success: false, message: "Service provider not found." });
    }

    // Find and delete provider profile
    await db.collection("providerprofiles").deleteMany({ user: providerId });

    // Release any requests currently assigned or in-progress so customers aren't blocked
    await db.collection("servicerequests").updateMany(
      { provider: providerId, status: { $in: ["accepted", "in_progress", "open_for_quotes"] } },
      { $set: { status: "open_for_quotes", provider: null, updatedAt: new Date() } }
    );

    // Delete user from users collection
    await db.collection("users").deleteOne({ _id: providerId });

    return res.json({
      success: true,
      message: `Service provider '${user.name}' (${user.email}) has been deleted successfully.`,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get single provider's detailed earnings breakdown.
 */
async function getProviderEarnings(req, res, next) {
  try {
    const providerId = parseObjectId(req.params.id);
    if (!providerId) return res.status(400).json({ success: false, message: "Invalid provider ID." });

    const db = mongoose.connection.db;
    const user = await db.collection("users").findOne({ _id: providerId, role: "provider" }, { projection: { password: 0 } });
    if (!user) return res.status(404).json({ success: false, message: "Service provider not found." });

    const profile = await db.collection("providerprofiles").findOne({ user: providerId });
    const profileId = profile ? profile._id : null;

    const bookings = profileId ? await db.collection("bookings").find({ provider: profileId }).toArray() : [];
    const bookingIds = bookings.map((b) => b._id);
    const serviceRequests = await db.collection("servicerequests").find({ provider: providerId }).toArray();
    const requestIds = serviceRequests.map((r) => r._id);

    const invoices = await db
      .collection("invoices")
      .find({
        $or: [
          { provider: providerId },
          { booking: { $in: bookingIds } },
          { request: { $in: requestIds } },
        ],
      })
      .sort({ createdAt: -1 })
      .toArray();

    const customerIds = invoices.map((inv) => inv.customer || inv.paidBy).filter(Boolean);
    const customers = customerIds.length
      ? await db.collection("users").find({ _id: { $in: customerIds } }, { projection: { name: 1, email: 1 } }).toArray()
      : [];
    const customerMap = new Map(customers.map((c) => [String(c._id), c.name]));

    const paidInvoices = invoices.filter((i) => i.status === "paid");
    const totalEarned = paidInvoices.reduce((sum, i) => sum + Number(i.providerAmount || i.total || 0), 0);
    const pendingEarned = invoices.filter((i) => i.status !== "paid").reduce((sum, i) => sum + Number(i.providerAmount || i.total || 0), 0);

    return res.json({
      success: true,
      data: {
        provider: {
          id: String(user._id),
          name: user.name,
          email: user.email,
          phone: user.phone,
          skills: profile?.skills || [],
          totalEarned,
          pendingEarned,
          completedJobsCount: paidInvoices.length,
        },
        invoices: invoices.map((inv) => ({
          id: String(inv._id),
          reference: `INV-${String(inv._id).slice(-6).toUpperCase()}`,
          customerName: customerMap.get(String(inv.customer || inv.paidBy)) || "Customer",
          amount: Number(inv.providerAmount || inv.total || 0),
          status: inv.status || "pending",
          paymentMethod: inv.paymentMethod || "Not recorded",
          paidAt: inv.paidAt || null,
          createdAt: inv.createdAt || inv.updatedAt || null,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getProviders,
  createProvider,
  deleteProvider,
  getProviderEarnings,
};
