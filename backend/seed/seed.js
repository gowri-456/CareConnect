// Populates the database with sample data covering every role and workflow
// stage described in the spec, so you have something to click through
// immediately after setup.
//
// Run with: npm run seed
// WARNING: this clears existing data in the collections it touches.

require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../src/config/db");

const User = require("../src/models/User");
const ServiceCategory = require("../src/models/ServiceCategory");
const ProviderProfile = require("../src/models/ProviderProfile");
const AvailabilitySlot = require("../src/models/AvailabilitySlot");
const ServiceRequest = require("../src/models/ServiceRequest");
const Quote = require("../src/models/Quote");
const Booking = require("../src/models/Booking");
const Job = require("../src/models/Job");
const Invoice = require("../src/models/Invoice");
const Review = require("../src/models/Review");
const Dispute = require("../src/models/Dispute");
const Notification = require("../src/models/Notification");

async function run() {
  await connectDB();

  console.log("Clearing existing data...");
  await Promise.all([
    User.deleteMany({}),
    ServiceCategory.deleteMany({}),
    ProviderProfile.deleteMany({}),
    AvailabilitySlot.deleteMany({}),
    ServiceRequest.deleteMany({}),
    Quote.deleteMany({}),
    Booking.deleteMany({}),
    Job.deleteMany({}),
    Invoice.deleteMany({}),
    Review.deleteMany({}),
    Dispute.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  const password = await bcrypt.hash("password123", 10);

  console.log("Creating users...");
  const admin = await User.create({ name: "Alice Admin", email: "admin@demo.com", password, role: "admin" });
  const ops = await User.create({ name: "Oscar Ops", email: "ops@demo.com", password, role: "ops_manager" });
  const support = await User.create({ name: "Sam Support", email: "support@demo.com", password, role: "support_agent" });

  const customer1 = await User.create({ name: "Carla Customer", email: "customer1@demo.com", password, role: "customer" });
  const customer2 = await User.create({ name: "Chris Customer", email: "customer2@demo.com", password, role: "customer" });

  const providerUser1 = await User.create({ name: "Priya Provider", email: "provider1@demo.com", password, role: "provider" });
  const providerUser2 = await User.create({ name: "Paul Provider", email: "provider2@demo.com", password, role: "provider" });

  console.log("Creating service categories...");
  const plumbing = await ServiceCategory.create({
    name: "Plumbing",
    description: "Leaks, pipes, fixtures, water heaters",
    requiredSkills: ["plumbing", "pipe repair", "leak", "water heater"],
    basePriceMin: 50,
    basePriceMax: 300,
  });
  const electrical = await ServiceCategory.create({
    name: "Electrical",
    description: "Wiring, outlets, breakers, lighting",
    requiredSkills: ["electrical", "wiring", "outlet", "breaker"],
    basePriceMin: 60,
    basePriceMax: 350,
  });
  const cleaning = await ServiceCategory.create({
    name: "Cleaning",
    description: "Home and deep cleaning services",
    requiredSkills: ["cleaning", "deep clean", "housekeeping"],
    basePriceMin: 40,
    basePriceMax: 150,
  });
  await ServiceCategory.create({
    name: "Appliance Repair",
    description: "Fridges, washers, dryers, ovens",
    requiredSkills: ["appliance", "repair", "washer", "fridge", "oven"],
    basePriceMin: 50,
    basePriceMax: 250,
  });

  console.log("Creating provider profiles...");
  const provider1 = await ProviderProfile.create({
    user: providerUser1._id,
    bio: "Licensed plumber with 8 years of experience.",
    skills: ["plumbing", "pipe repair", "leak", "water heater"],
    serviceAreas: ["Hyderabad"],
    experienceYears: 8,
    hourlyRate: 25,
    verificationStatus: "verified",
    ratingAvg: 4.5,
    ratingCount: 2,
    documents: [{ type: "license", url: "https://example.com/docs/license1.pdf", status: "approved" }],
  });
  const provider2 = await ProviderProfile.create({
    user: providerUser2._id,
    bio: "Electrician specializing in residential wiring.",
    skills: ["electrical", "wiring", "outlet", "breaker"],
    serviceAreas: ["Hyderabad"],
    experienceYears: 5,
    hourlyRate: 30,
    verificationStatus: "pending",
    documents: [{ type: "license", url: "https://example.com/docs/license2.pdf", status: "pending" }],
  });

  console.log("Creating availability slots...");
  const now = new Date();
  const slot1Start = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow
  const slot1End = new Date(slot1Start.getTime() + 2 * 60 * 60 * 1000); // +2 hrs
  const slot1 = await AvailabilitySlot.create({
    provider: provider1._id,
    date: slot1Start,
    startTime: slot1Start,
    endTime: slot1End,
  });
  await AvailabilitySlot.create({
    provider: provider2._id,
    date: slot1Start,
    startTime: new Date(slot1Start.getTime() + 3 * 60 * 60 * 1000),
    endTime: new Date(slot1Start.getTime() + 5 * 60 * 60 * 1000),
  });

  console.log("Creating a full request -> quote -> booking -> job -> invoice -> review flow...");
  const request1 = await ServiceRequest.create({
    customer: customer1._id,
    descriptionText: "I have a leak under my kitchen sink, need plumbing help urgently.",
    category: plumbing._id,
    aiClassification: { category: "Plumbing", confidence: 0.8, suggestedSkills: plumbing.requiredSkills },
    location: { address: "12 MG Road", city: "Hyderabad" },
    preferredDate: slot1Start,
    urgency: "urgent",
    status: "booked",
  });

  const quote1 = await Quote.create({
    serviceRequest: request1._id,
    provider: provider1._id,
    price: 120,
    estimatedDurationMins: 90,
    message: "I can fix this tomorrow morning.",
    status: "accepted",
  });

  const booking1 = await Booking.create({
    serviceRequest: request1._id,
    quote: quote1._id,
    customer: customer1._id,
    provider: provider1._id,
    slot: slot1._id,
    scheduledDate: slot1Start,
    status: "completed",
  });
  slot1.isBooked = true;
  slot1.booking = booking1._id;
  await slot1.save();

  const job1 = await Job.create({
    booking: booking1._id,
    status: "customer_confirmed",
    notes: [{ author: providerUser1._id, text: "Replaced the pipe joint, tested for leaks." }],
    beforeEvidence: ["https://example.com/evidence/before1.jpg"],
    afterEvidence: ["https://example.com/evidence/after1.jpg"],
    customerConfirmedAt: new Date(),
  });

  await Invoice.create({
    job: job1._id,
    booking: booking1._id,
    lineItems: [{ description: "Pipe joint replacement", amount: 120 }],
    subtotal: 120,
    tax: 6,
    total: 126,
    status: "paid",
    paidAt: new Date(),
  });

  await Review.create({
    booking: booking1._id,
    customer: customer1._id,
    provider: provider1._id,
    rating: 5,
    comment: "Fast, clean, professional work.",
  });

  console.log("Creating a second, in-progress request (open for quotes)...");
  await ServiceRequest.create({
    customer: customer2._id,
    descriptionText: "My kitchen outlet stopped working, might be a wiring issue.",
    category: electrical._id,
    aiClassification: { category: "Electrical", confidence: 0.75, suggestedSkills: electrical.requiredSkills },
    location: { address: "45 Park Lane", city: "Hyderabad" },
    urgency: "normal",
    status: "open_for_quotes",
  });

  console.log("Creating an unclassified request (customer used vague wording)...");
  await ServiceRequest.create({
    customer: customer2._id,
    descriptionText: "Something in my house needs fixing, not sure what.",
    status: "pending_classification",
  });

  console.log("Creating a dispute on the completed booking (for demo purposes)...");
  await Dispute.create({
    booking: booking1._id,
    raisedBy: customer1._id,
    type: "pricing",
    description: "I was charged more than the quoted price.",
    status: "open",
  });

  console.log("Creating sample notifications...");
  await Notification.create({
    user: customer1._id,
    type: "booking_confirmed",
    message: "Your booking has been confirmed.",
    relatedEntity: { type: "Booking", id: booking1._id },
  });

  console.log("\nSeed complete. Test accounts (all use password: password123):");
  console.log("  admin@demo.com        (admin)");
  console.log("  ops@demo.com          (ops_manager)");
  console.log("  support@demo.com      (support_agent)");
  console.log("  provider1@demo.com    (provider, verified)");
  console.log("  provider2@demo.com    (provider, pending verification)");
  console.log("  customer1@demo.com    (customer)");
  console.log("  customer2@demo.com    (customer)");

  process.exit(0);
}

run().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
