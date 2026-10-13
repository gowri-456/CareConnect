const mongoose = require("mongoose");

async function getPayments(req, res, next) {
  try {
    const db = mongoose.connection.db;
    let invoiceFilter = {};

    if (req.user.role === "customer") {
      const [bookings, requests] = await Promise.all([
        db.collection("bookings").find({ customer: req.user._id }, { projection: { _id: 1 } }).toArray(),
        db.collection("servicerequests").find({ customer: req.user._id }, { projection: { _id: 1 } }).toArray(),
      ]);
      const bookingIds = bookings.map((b) => b._id);
      const requestIds = requests.map((r) => r._id);

      invoiceFilter = {
        $or: [
          { customer: req.user._id },
          { paidBy: req.user._id },
          { booking: { $in: bookingIds } },
          { request: { $in: requestIds } },
        ],
      };
    } else if (req.user.role === "provider") {
      const profile = await db.collection("providerprofiles").findOne({ user: req.user._id }, { projection: { _id: 1 } });
      const [bookings, requests] = await Promise.all([
        profile ? db.collection("bookings").find({ provider: profile._id }, { projection: { _id: 1 } }).toArray() : [],
        db.collection("servicerequests").find({ provider: req.user._id }, { projection: { _id: 1 } }).toArray(),
      ]);
      const bookingIds = bookings.map((b) => b._id);
      const requestIds = requests.map((r) => r._id);

      invoiceFilter = {
        $or: [
          { provider: req.user._id },
          { booking: { $in: bookingIds } },
          { request: { $in: requestIds } },
        ],
      };
    } else {
      // Admin / Manager sees all invoices
      invoiceFilter = {};
    }

    const invoices = await db
      .collection("invoices")
      .find(invoiceFilter)
      .sort({ createdAt: -1 })
      .limit(150)
      .toArray();

    // Collect related booking and request IDs to gather metadata
    const bookingIds = invoices.map((inv) => inv.booking).filter(Boolean);
    const requestIds = invoices.map((inv) => inv.request).filter(Boolean);
    const userIdsToFetch = new Set();

    for (const inv of invoices) {
      if (inv.customer) userIdsToFetch.add(String(inv.customer));
      if (inv.paidBy) userIdsToFetch.add(String(inv.paidBy));
      if (inv.provider) userIdsToFetch.add(String(inv.provider));
    }

    const [bookings, requests, users, jobs] = await Promise.all([
      bookingIds.length
        ? db.collection("bookings").find({ _id: { $in: bookingIds } }, { projection: { _id: 1, customer: 1, provider: 1 } }).toArray()
        : [],
      requestIds.length
        ? db.collection("servicerequests").find({ _id: { $in: requestIds } }, { projection: { _id: 1, categoryLabel: 1, descriptionText: 1, customer: 1, provider: 1 } }).toArray()
        : [],
      userIdsToFetch.size
        ? db.collection("users").find({ _id: { $in: Array.from(userIdsToFetch).map((id) => new mongoose.Types.ObjectId(id)) } }, { projection: { name: 1, email: 1 } }).toArray()
        : [],
      bookingIds.length
        ? db.collection("jobs").find({ booking: { $in: bookingIds } }, { projection: { booking: 1, hoursWorked: 1 } }).toArray()
        : [],
    ]);

    const userNameMap = new Map(users.map((u) => [String(u._id), u.name]));
    const hoursByBooking = new Map(jobs.map((j) => [String(j.booking), Number(j.hoursWorked) || 0]));
    const requestMap = new Map(requests.map((r) => [String(r._id), r]));

    const isProvider = req.user.role === "provider";
    const mappedInvoices = invoices.map((inv) => {
      const total = Number(inv.total || 0);
      const providerAmount = Number(inv.providerAmount || total || 0);
      const matchedReq = inv.request ? requestMap.get(String(inv.request)) : null;

      let customerName = userNameMap.get(String(inv.customer || inv.paidBy)) || "Customer";
      let providerName = userNameMap.get(String(inv.provider)) || "Provider";

      return {
        id: String(inv._id),
        reference: `INV-${String(inv._id).slice(-6).toUpperCase()}`,
        booking: String(inv.booking || ""),
        requestId: inv.request ? String(inv.request) : "",
        title: matchedReq?.categoryLabel || matchedReq?.descriptionText || "Service Task",
        customerName,
        providerName,
        total,
        providerAmount,
        hoursWorked: hoursByBooking.get(String(inv.booking)) || 0,
        status: inv.status || "pending",
        paidAt: inv.paidAt || null,
        paymentMethod: inv.paymentMethod || "Not recorded",
        createdAt: inv.createdAt || inv.updatedAt || null,
      };
    });

    const paidInvoices = mappedInvoices.filter((inv) => inv.status === "paid");
    const pendingInvoices = mappedInvoices.filter((inv) => inv.status !== "paid");

    const totalEarned = paidInvoices.reduce((sum, inv) => sum + (isProvider ? inv.providerAmount : inv.total), 0);
    const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + (isProvider ? inv.providerAmount : inv.total), 0);

    return res.json({
      success: true,
      summary: {
        totalEarned,
        pendingAmount,
        paidCount: paidInvoices.length,
        pendingCount: pendingInvoices.length,
      },
      data: mappedInvoices,
    });
  } catch (error) {
    return next(error);
  }
}

async function getMapProviders(req, res, next) {
  try {
    const db = mongoose.connection.db;
    const profiles = await db
      .collection("providerprofiles")
      .find({ verificationStatus: "verified" }, { projection: { user: 1, skills: 1, serviceAreas: 1, ratingAvg: 1, ratingCount: 1, location: 1 } })
      .limit(200)
      .toArray();

    const userIds = profiles.map((p) => p.user).filter(Boolean);
    const users = await db
      .collection("users")
      .find({ _id: { $in: userIds } }, { projection: { name: 1 } })
      .toArray();
    const names = new Map(users.map((p) => [String(p._id), p.name]));

    return res.json({
      success: true,
      data: profiles.map((profile) => {
        const latitude = Number(profile.location?.latitude);
        const longitude = Number(profile.location?.longitude);
        return {
          id: String(profile._id),
          name: names.get(String(profile.user)) || "Verified provider",
          skills: Array.isArray(profile.skills) ? profile.skills : [],
          serviceAreas: Array.isArray(profile.serviceAreas) ? profile.serviceAreas : [],
          rating: Number(profile.ratingAvg || 0),
          ratingCount: Number(profile.ratingCount || 0),
          location: Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null,
        };
      }),
    });
  } catch (error) {
    return next(error);
  }
}

async function getNotifications(req, res, next) {
  try {
    const notifications = await mongoose.connection.db
      .collection("notifications")
      .find({ user: req.user._id }, { projection: { _id: 1, request: 1, type: 1, title: 1, message: 1, createdAt: 1, readAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return res.json({
      success: true,
      data: notifications.map((n) => ({
        id: String(n._id),
        requestId: n.request ? String(n.request) : "",
        type: n.type,
        title: n.title,
        message: n.message,
        createdAt: n.createdAt,
        read: Boolean(n.readAt),
      })),
    });
  } catch (error) {
    return next(error);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    await mongoose.connection.db
      .collection("notifications")
      .updateMany({ user: req.user._id, readAt: null }, { $set: { readAt: new Date() } });

    return res.json({ success: true, message: "Notifications marked as read." });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getNotifications,
  markAllNotificationsRead,
  getPayments,
  getMapProviders,
};