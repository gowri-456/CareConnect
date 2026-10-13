const mongoose = require("mongoose");

function summarize(document, prefix) {
  const suffix = String(document._id).slice(-6).toUpperCase();
  if (prefix === "REQ") {
    return {
      id: `REQ-${suffix}`,
      requestId: String(document._id),
      title: document.categoryLabel || (typeof document.category === "string" ? document.category : "Service request"),
      description: document.descriptionText || "No description provided.",
      category: document.categoryLabel || (typeof document.category === "string" ? document.category : "Service request"),
      status: document.status || "pending",
      amount: Number(document.amount || 0),
      paymentStatus: document.paymentStatus || "",
      urgency: document.urgency || "normal",
      city: document.location?.city || "Location not provided",
      date: document.createdAt || document.updatedAt || null,
    };
  }

  return {
    id: `${prefix}-${suffix}`,
    title: `Booking ${suffix}`,
    category: "Scheduled service",
    status: document.status || "pending",
    date: document.scheduledDate || document.updatedAt || document.createdAt || null,
  };
}

async function getDashboard(req, res, next) {
  try {
    const db = mongoose.connection.db;
    const requestCollection = db.collection("servicerequests");
    const bookingCollection = db.collection("bookings");
    const providerCollection = db.collection("providerprofiles");
    const userCollection = db.collection("users");
    const invoiceCollection = db.collection("invoices");

    const isCustomer = req.user.role === "customer";
    const isProvider = req.user.role === "provider";
    const isAdmin = req.user.role === "admin";

    let requestFilter = {};
    let bookingFilter = {};
    if (isCustomer) {
      requestFilter = { customer: req.user._id };
      bookingFilter = { customer: req.user._id };
    } else if (isProvider) {
      const provider = await providerCollection.findOne({ user: req.user._id }, { projection: { _id: 1 } });
      requestFilter = { $or: [{ provider: req.user._id }, { status: "open_for_quotes" }] };
      bookingFilter = provider ? { provider: provider._id } : { _id: null };
    }

    const [requestCount, bookingCount, providerCount, customerCount, openRequestCount, requests, bookings] = await Promise.all([
      requestCollection.countDocuments(requestFilter),
      bookingCollection.countDocuments(bookingFilter),
      userCollection.countDocuments({ role: "provider" }),
      userCollection.countDocuments({ role: "customer" }),
      requestCollection.countDocuments({ ...requestFilter, status: { $in: ["open_for_quotes", "accepted", "in_progress", "awaiting_customer_confirmation"] } }),
      requestCollection.find(requestFilter).sort({ updatedAt: -1, createdAt: -1 }).limit(20).toArray(),
      bookingCollection.find(bookingFilter, { projection: { _id: 1, status: 1, scheduledDate: 1, createdAt: 1, updatedAt: 1 } }).sort({ scheduledDate: -1, createdAt: -1 }).limit(6).toArray(),
    ]);

    return res.json({
      success: true,
      data: {
        counts: {
          requests: requestCount,
          openRequests: openRequestCount,
          bookings: bookingCount,
          providers: providerCount,
          customers: customerCount,
        },
        requests: requests.map((record) => summarize(record, "REQ")),
        bookings: bookings.map((record) => summarize(record, "BOOK")),
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getDashboard };