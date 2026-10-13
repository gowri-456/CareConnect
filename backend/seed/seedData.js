const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/careconnect";

async function seed() {
  console.log("Connecting to MongoDB for seeding...");
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  console.log("Connected. Preparing collections and test data...");

  const now = new Date();
  const hashedPassword = await bcrypt.hash("Pass@123", 10);
  const adminHashedPassword = await bcrypt.hash("Admin@123", 10);

  // 1. Users
  const adminId = new mongoose.Types.ObjectId("6ac5e0000000000000000001");
  const provider1Id = new mongoose.Types.ObjectId("6ac5e0000000000000000002");
  const provider2Id = new mongoose.Types.ObjectId("6ac5e0000000000000000003");
  const provider3Id = new mongoose.Types.ObjectId("6ac5e0000000000000000004");
  const customer1Id = new mongoose.Types.ObjectId("6ac5e0000000000000000005");
  const customer2Id = new mongoose.Types.ObjectId("6ac5e0000000000000000006");

  const usersToUpsert = [
    {
      _id: adminId,
      name: "CareConnect Administrator",
      email: "admin@careconnect.lk",
      password: adminHashedPassword,
      role: "admin",
      phone: "+94 11 234 5678",
      isVerified: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: provider1Id,
      name: "Kamal Perera",
      email: "kamal.perera@careconnect.lk",
      password: hashedPassword,
      role: "provider",
      phone: "+94 77 123 4567",
      isVerified: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: provider2Id,
      name: "Sunil Silva",
      email: "sunil.silva@careconnect.lk",
      password: hashedPassword,
      role: "provider",
      phone: "+94 71 987 6543",
      isVerified: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: provider3Id,
      name: "Nimal Fernando",
      email: "nimal.fernando@careconnect.lk",
      password: hashedPassword,
      role: "provider",
      phone: "+94 76 555 4321",
      isVerified: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: customer1Id,
      name: "Anoma Wijesinghe",
      email: "anoma.wijesinghe@careconnect.lk",
      password: hashedPassword,
      role: "customer",
      phone: "+94 77 333 2211",
      isVerified: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: customer2Id,
      name: "Kasun Jayawardena",
      email: "kasun.jayawardena@careconnect.lk",
      password: hashedPassword,
      role: "customer",
      phone: "+94 70 444 8899",
      isVerified: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const user of usersToUpsert) {
    await db.collection("users").updateOne(
      { email: user.email },
      { $set: user },
      { upsert: true }
    );
  }
  console.log("✓ Seeded 6 users (1 Admin, 3 Providers, 2 Customers)");

  // 2. Provider Profiles
  const profile1Id = new mongoose.Types.ObjectId("6ac5e1000000000000000001");
  const profile2Id = new mongoose.Types.ObjectId("6ac5e1000000000000000002");
  const profile3Id = new mongoose.Types.ObjectId("6ac5e1000000000000000003");

  const profilesToUpsert = [
    {
      _id: profile1Id,
      user: provider1Id,
      bio: "Certified plumber with 8+ years experience in domestic pipe fittings, bathroom fixtures, and drainage maintenance.",
      skills: ["Plumbing", "Pipe Fitting", "Bathroom Installation", "Leak Detection"],
      serviceAreas: ["Colombo", "Dehiwala", "Mount Lavinia"],
      experienceYears: 8,
      hourlyRate: 1800,
      verificationStatus: "verified",
      ratingAvg: 4.9,
      ratingCount: 14,
      isAvailableForWork: true,
      location: { latitude: 6.9271, longitude: 79.8612 },
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: profile2Id,
      user: provider2Id,
      bio: "Licensed domestic electrician specialized in household wiring, tripping diagnosis, and appliance repairs.",
      skills: ["Electrical", "Wiring", "Appliance Repair", "Lighting Installation"],
      serviceAreas: ["Colombo", "Kotte", "Rajagiriya", "Nugegoda"],
      experienceYears: 6,
      hourlyRate: 1500,
      verificationStatus: "verified",
      ratingAvg: 4.8,
      ratingCount: 9,
      isAvailableForWork: true,
      location: { latitude: 6.8905, longitude: 79.8828 },
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: profile3Id,
      user: provider3Id,
      bio: "Master carpenter with custom cabinetry, door hanging, furniture assembly, and lock repair expertise.",
      skills: ["Carpentry", "Furniture Assembly", "Door Repair", "Cabinetry"],
      serviceAreas: ["Colombo", "Maharagama", "Battaramulla"],
      experienceYears: 10,
      hourlyRate: 2000,
      verificationStatus: "verified",
      ratingAvg: 5.0,
      ratingCount: 12,
      isAvailableForWork: true,
      location: { latitude: 6.8402, longitude: 79.9275 },
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const prof of profilesToUpsert) {
    await db.collection("providerprofiles").updateOne(
      { user: prof.user },
      { $set: prof },
      { upsert: true }
    );
  }
  console.log("✓ Seeded 3 verified provider profiles with geographic coordinates");

  // 3. Service Requests in every workflow state
  const reqOpenId = new mongoose.Types.ObjectId("6ac5e2000000000000000001");
  const reqAcceptedId = new mongoose.Types.ObjectId("6ac5e2000000000000000002");
  const reqInProgressId = new mongoose.Types.ObjectId("6ac5e2000000000000000003");
  const reqAwaitingConfirmId = new mongoose.Types.ObjectId("6ac5e2000000000000000004");
  const reqAwaitingPayId = new mongoose.Types.ObjectId("6ac5e2000000000000000005");
  const reqCompletedId = new mongoose.Types.ObjectId("6ac5e2000000000000000006");

  const invAwaitingConfirmId = new mongoose.Types.ObjectId("6ac5e3000000000000000001");
  const invAwaitingPayId = new mongoose.Types.ObjectId("6ac5e3000000000000000002");
  const invCompletedId = new mongoose.Types.ObjectId("6ac5e3000000000000000003");

  const requestsToUpsert = [
    {
      _id: reqOpenId,
      customer: customer1Id,
      descriptionText: "Bathroom basin mixer tap leaking heavily under the counter. Need immediate washer replacement.",
      category: "Plumbing",
      categoryLabel: "Plumbing",
      location: { city: "Colombo" },
      urgency: "urgent",
      status: "open_for_quotes",
      provider: null,
      amount: 0,
      createdAt: new Date(Date.now() - 3600000 * 4),
      updatedAt: new Date(Date.now() - 3600000 * 4),
    },
    {
      _id: reqAcceptedId,
      customer: customer1Id,
      provider: provider1Id,
      descriptionText: "Install external hose connection and fix water pressure valve in garden.",
      category: "Plumbing",
      categoryLabel: "Plumbing",
      location: { city: "Dehiwala" },
      urgency: "normal",
      status: "accepted",
      acceptedAt: new Date(Date.now() - 3600000 * 3),
      amount: 0,
      createdAt: new Date(Date.now() - 3600000 * 5),
      updatedAt: new Date(Date.now() - 3600000 * 3),
    },
    {
      _id: reqInProgressId,
      customer: customer2Id,
      provider: provider2Id,
      descriptionText: "Living room master breaker keeps tripping when AC and TV are on simultaneously. Need wiring check.",
      category: "Electrical",
      categoryLabel: "Electrical",
      location: { city: "Kotte" },
      urgency: "high",
      status: "in_progress",
      acceptedAt: new Date(Date.now() - 3600000 * 6),
      serviceStartedAt: new Date(Date.now() - 3600000 * 2),
      amount: 0,
      createdAt: new Date(Date.now() - 3600000 * 8),
      updatedAt: new Date(Date.now() - 3600000 * 2),
    },
    {
      _id: reqAwaitingConfirmId,
      customer: customer1Id,
      provider: provider1Id,
      descriptionText: "Repair kitchen sink siphon trap and replace faulty cold water supply valve.",
      category: "Plumbing",
      categoryLabel: "Plumbing",
      location: { city: "Colombo" },
      urgency: "normal",
      status: "awaiting_customer_confirmation",
      invoice: invAwaitingConfirmId,
      amount: 3500,
      paymentStatus: "pending",
      acceptedAt: new Date(Date.now() - 3600000 * 12),
      serviceStartedAt: new Date(Date.now() - 3600000 * 5),
      workCompletedAt: new Date(Date.now() - 3600000 * 1),
      createdAt: new Date(Date.now() - 3600000 * 14),
      updatedAt: new Date(Date.now() - 3600000 * 1),
    },
    {
      _id: reqAwaitingPayId,
      customer: customer1Id,
      provider: provider3Id,
      descriptionText: "Re-align sliding wardrobe doors, tighten track bearings, and assemble one shoe rack.",
      category: "Carpentry",
      categoryLabel: "Carpentry",
      location: { city: "Colombo" },
      urgency: "normal",
      status: "awaiting_payment",
      invoice: invAwaitingPayId,
      amount: 4500,
      paymentStatus: "due",
      acceptedAt: new Date(Date.now() - 3600000 * 20),
      serviceStartedAt: new Date(Date.now() - 3600000 * 10),
      workCompletedAt: new Date(Date.now() - 3600000 * 4),
      customerConfirmedAt: new Date(Date.now() - 3600000 * 2),
      createdAt: new Date(Date.now() - 3600000 * 24),
      updatedAt: new Date(Date.now() - 3600000 * 2),
    },
    {
      _id: reqCompletedId,
      customer: customer2Id,
      provider: provider2Id,
      descriptionText: "Install heavy-duty ceiling fan and configure wall speed regulator in dining room.",
      category: "Electrical",
      categoryLabel: "Electrical",
      location: { city: "Kotte" },
      urgency: "normal",
      status: "completed",
      invoice: invCompletedId,
      amount: 5200,
      paymentStatus: "paid",
      paymentMethod: "Credit / Debit Card",
      paidAt: new Date(Date.now() - 3600000 * 24),
      rating: 5,
      reviewText: "Sunil was very polite, worked fast, and made sure all wiring was neat and safely insulated. Highly recommended!",
      reviewedAt: new Date(Date.now() - 3600000 * 22),
      createdAt: new Date(Date.now() - 3600000 * 48),
      updatedAt: new Date(Date.now() - 3600000 * 22),
    },
  ];

  for (const req of requestsToUpsert) {
    await db.collection("servicerequests").updateOne(
      { _id: req._id },
      { $set: req },
      { upsert: true }
    );
  }
  console.log("✓ Seeded 6 service requests covering every lifecycle step");

  // 4. Invoices
  const invoicesToUpsert = [
    {
      _id: invAwaitingConfirmId,
      request: reqAwaitingConfirmId,
      customer: customer1Id,
      paidBy: customer1Id,
      provider: provider1Id,
      total: 3500,
      providerAmount: 3500,
      status: "pending",
      paymentMethod: "Pending customer choice",
      createdAt: new Date(Date.now() - 3600000 * 1),
      updatedAt: new Date(Date.now() - 3600000 * 1),
    },
    {
      _id: invAwaitingPayId,
      request: reqAwaitingPayId,
      customer: customer1Id,
      paidBy: customer1Id,
      provider: provider3Id,
      total: 4500,
      providerAmount: 4500,
      status: "pending",
      paymentMethod: "Pending customer choice",
      createdAt: new Date(Date.now() - 3600000 * 4),
      updatedAt: new Date(Date.now() - 3600000 * 2),
    },
    {
      _id: invCompletedId,
      request: reqCompletedId,
      customer: customer2Id,
      paidBy: customer2Id,
      provider: provider2Id,
      total: 5200,
      providerAmount: 5200,
      status: "paid",
      paymentMethod: "Credit / Debit Card",
      paidAt: new Date(Date.now() - 3600000 * 24),
      createdAt: new Date(Date.now() - 3600000 * 26),
      updatedAt: new Date(Date.now() - 3600000 * 24),
    },
  ];

  for (const inv of invoicesToUpsert) {
    await db.collection("invoices").updateOne(
      { _id: inv._id },
      { $set: inv },
      { upsert: true }
    );
  }
  console.log("✓ Seeded 3 invoices (Pending, Verified due, and Paid)");

  // 5. Notifications
  const notificationsToUpsert = [
    {
      _id: new mongoose.Types.ObjectId("6ac5e4000000000000000001"),
      user: customer1Id,
      request: reqAwaitingConfirmId,
      type: "service_completed",
      title: "Work marked complete - Action required",
      message: "Kamal Perera marked REQ-000004 complete (Total: Rs. 3,500). Please verify whether the task was completed.",
      createdAt: new Date(Date.now() - 3600000 * 1),
      readAt: null,
    },
    {
      _id: new mongoose.Types.ObjectId("6ac5e4000000000000000002"),
      user: customer1Id,
      request: reqAwaitingPayId,
      type: "customer_confirmed",
      title: "Work verified - Payment due",
      message: "You verified completion of REQ-000005. Payment of Rs. 4,500 is due.",
      createdAt: new Date(Date.now() - 3600000 * 2),
      readAt: null,
    },
    {
      _id: new mongoose.Types.ObjectId("6ac5e4000000000000000003"),
      user: provider1Id,
      request: reqAcceptedId,
      type: "service_accepted",
      title: "Request assigned",
      message: "You accepted REQ-000002. Click 'Start service' when you are on-site.",
      createdAt: new Date(Date.now() - 3600000 * 3),
      readAt: null,
    },
  ];

  for (const notif of notificationsToUpsert) {
    await db.collection("notifications").updateOne(
      { _id: notif._id },
      { $set: notif },
      { upsert: true }
    );
  }
  console.log("✓ Seeded 3 live notifications");

  console.log("\n=======================================================");
  console.log("🎉 CareConnect Seed Complete!");
  console.log("Demo Accounts Available:");
  console.log("  • Admin:    admin@careconnect.lk / Admin@123");
  console.log("  • Customer: anoma.wijesinghe@careconnect.lk / Pass@123");
  console.log("  • Provider: kamal.perera@careconnect.lk / Pass@123");
  console.log("=======================================================\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
