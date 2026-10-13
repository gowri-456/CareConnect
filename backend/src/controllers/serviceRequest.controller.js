const mongoose = require("mongoose");

function serializeRequest(request, userMap = new Map()) {
  const suffix = String(request._id).slice(-6).toUpperCase();
  const providerId = request.provider ? String(request.provider) : null;
  const customerId = request.customer ? String(request.customer) : null;

  return {
    id: `REQ-${suffix}`,
    requestId: String(request._id),
    title: request.categoryLabel || (typeof request.category === "string" ? request.category : "Service request"),
    description: request.descriptionText,
    category: request.categoryLabel || (typeof request.category === "string" ? request.category : "Service request"),
    status: request.status || "pending_classification",
    amount: Number(request.amount || 0),
    paymentStatus: request.paymentStatus || "",
    paymentMethod: request.paymentMethod || "",
    urgency: request.urgency || "normal",
    city: request.location?.city || "Location not provided",
    date: request.createdAt || request.updatedAt || null,
    provider: providerId,
    customer: customerId,
    providerName: providerId ? (userMap.get(providerId) || "Assigned provider") : null,
    customerName: customerId ? (userMap.get(customerId) || "Customer") : null,
    completionRejectedReason: request.completionRejectedReason || null,
    rating: request.rating || null,
    reviewText: request.reviewText || null,
    reviewedAt: request.reviewedAt || null,
    cancelReason: request.cancelReason || null,
    cancelledAt: request.cancelledAt || null,
  };
}

function requestFilterFor(user) {
  if (user.role === "customer") return { customer: user._id };
  if (user.role === "provider") return { $or: [{ status: "open_for_quotes" }, { provider: user._id }] };
  return {};
}

async function listServiceRequests(req, res, next) {
  try {
    const filter = requestFilterFor(req.user);
    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
    const requests = await mongoose.connection.db
      .collection("servicerequests")
      .find(filter)
      .sort({ createdAt: -1, updatedAt: -1 })
      .limit(limit)
      .toArray();

    // Map user names for providers and customers
    const userIds = [];
    for (const r of requests) {
      if (r.provider) userIds.push(r.provider);
      if (r.customer) userIds.push(r.customer);
    }

    const users = userIds.length
      ? await mongoose.connection.db.collection("users").find({ _id: { $in: userIds } }, { projection: { name: 1 } }).toArray()
      : [];
    const userMap = new Map(users.map((u) => [String(u._id), u.name]));

    return res.json({ success: true, data: requests.map((r) => serializeRequest(r, userMap)) });
  } catch (error) {
    return next(error);
  }
}

async function createServiceRequest(req, res, next) {
  try {
    const { descriptionText, category, city, preferredDate, urgency } = req.body || {};
    if (!descriptionText?.trim()) {
      return res.status(400).json({ success: false, message: "Describe the service you need." });
    }

    const now = new Date();
    const document = {
      _id: new mongoose.Types.ObjectId(),
      customer: req.user._id,
      descriptionText: descriptionText.trim(),
      category: null,
      categoryLabel: typeof category === "string" ? category.trim() : "",
      location: { city: typeof city === "string" ? city.trim() : "" },
      preferredDate: preferredDate ? new Date(preferredDate) : null,
      urgency: ["low", "normal", "high", "urgent"].includes(urgency) ? urgency : "normal",
      status: "open_for_quotes",
      attachments: [],
      createdAt: now,
      updatedAt: now,
    };

    if (document.preferredDate && Number.isNaN(document.preferredDate.getTime())) {
      return res.status(400).json({ success: false, message: "Choose a valid preferred date." });
    }

    await mongoose.connection.db.collection("servicerequests").insertOne(document);
    return res.status(201).json({ success: true, data: serializeRequest(document) });
  } catch (error) {
    return next(error);
  }
}

function parseRequestId(value) {
  return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;
}

async function acceptServiceRequest(req, res, next) {
  try {
    const requestId = parseRequestId(req.params.id);
    if (!requestId) return res.status(400).json({ success: false, message: "Invalid service request." });

    const db = mongoose.connection.db;
    const request = await db.collection("servicerequests").findOne({ _id: requestId, status: "open_for_quotes" });
    if (!request) {
      return res.status(409).json({ success: false, message: "This request is no longer available." });
    }

    const now = new Date();
    const result = await db.collection("servicerequests").updateOne(
      { _id: requestId, status: "open_for_quotes" },
      { $set: { status: "accepted", provider: req.user._id, acceptedAt: now, updatedAt: now } }
    );
    if (!result.modifiedCount) {
      return res.status(409).json({ success: false, message: "This request is no longer available." });
    }

    // Notify customer that provider accepted
    await db.collection("notifications").insertOne({
      _id: new mongoose.Types.ObjectId(),
      user: request.customer,
      request: requestId,
      type: "service_accepted",
      title: "Provider accepted request",
      message: `${req.user.name || "A service provider"} has accepted your request '${request.categoryLabel || "Service"}'.`,
      createdAt: now,
      readAt: null,
    });

    return res.json({ success: true, message: "Request accepted. You can start the service when ready." });
  } catch (error) {
    return next(error);
  }
}

async function startServiceRequest(req, res, next) {
  try {
    const requestId = parseRequestId(req.params.id);
    if (!requestId) return res.status(400).json({ success: false, message: "Invalid service request." });

    const db = mongoose.connection.db;
    const request = await db.collection("servicerequests").findOne({
      _id: requestId,
      provider: req.user._id,
      status: "accepted",
    });
    if (!request) return res.status(409).json({ success: false, message: "Only your accepted requests can be started." });

    const now = new Date();
    const notificationId = new mongoose.Types.ObjectId();
    await db.collection("notifications").insertOne({
      _id: notificationId,
      user: request.customer,
      request: requestId,
      type: "service_started",
      title: "Service started",
      message: `${req.user.name || "Provider"} has started work on ${serializeRequest(request).id}.`,
      createdAt: now,
      readAt: null,
    });

    const result = await db.collection("servicerequests").updateOne(
      { _id: requestId, provider: req.user._id, status: "accepted" },
      { $set: { status: "in_progress", serviceStartedAt: now, updatedAt: now } }
    );
    if (!result.modifiedCount) {
      await db.collection("notifications").deleteOne({ _id: notificationId });
      return res.status(409).json({ success: false, message: "This request has already changed." });
    }
    return res.json({ success: true, message: "Service started. Customer notified." });
  } catch (error) {
    return next(error);
  }
}

async function completeServiceRequest(req, res, next) {
  try {
    const requestId = parseRequestId(req.params.id);
    const amount = Number(req.body?.amount);
    if (!requestId) return res.status(400).json({ success: false, message: "Invalid service request." });
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Enter a valid amount greater than zero." });
    }

    const db = mongoose.connection.db;
    const request = await db.collection("servicerequests").findOne({
      _id: requestId,
      provider: req.user._id,
      status: "in_progress",
    });
    if (!request) return res.status(409).json({ success: false, message: "Only your in-progress requests can be marked complete." });

    const now = new Date();
    const invoiceId = new mongoose.Types.ObjectId();
    const notificationId = new mongoose.Types.ObjectId();

    await db.collection("invoices").insertOne({
      _id: invoiceId,
      request: requestId,
      customer: request.customer,
      paidBy: request.customer,
      provider: req.user._id,
      total: amount,
      providerAmount: amount,
      status: "pending",
      paymentMethod: "Pending customer choice",
      createdAt: now,
      updatedAt: now,
    });

    await db.collection("notifications").insertOne({
      _id: notificationId,
      user: request.customer,
      request: requestId,
      type: "service_completed",
      title: "Work marked complete - Action required",
      message: `${req.user.name || "Provider"} marked ${serializeRequest(request).id} complete (Total: Rs. ${amount.toLocaleString("en-LK")}). Please verify and confirm whether the task was completed.`,
      createdAt: now,
      readAt: null,
    });

    const result = await db.collection("servicerequests").updateOne(
      { _id: requestId, provider: req.user._id, status: "in_progress" },
      {
        $set: {
          status: "awaiting_customer_confirmation",
          amount,
          paymentStatus: "pending",
          invoice: invoiceId,
          workCompletedAt: now,
          updatedAt: now,
        },
      }
    );

    if (!result.modifiedCount) {
      await Promise.all([
        db.collection("invoices").deleteOne({ _id: invoiceId, status: "pending" }),
        db.collection("notifications").deleteOne({ _id: notificationId }),
      ]);
      return res.status(409).json({ success: false, message: "This request has already changed." });
    }

    return res.json({ success: true, message: "Work marked complete! Customer has been notified to verify and confirm completion." });
  } catch (error) {
    return next(error);
  }
}

async function confirmServiceRequest(req, res, next) {
  try {
    const requestId = parseRequestId(req.params.id);
    if (!requestId) return res.status(400).json({ success: false, message: "Invalid service request." });

    const db = mongoose.connection.db;
    const request = await db.collection("servicerequests").findOne({
      _id: requestId,
      customer: req.user._id,
      status: "awaiting_customer_confirmation",
    });
    if (!request) return res.status(409).json({ success: false, message: "This request is not waiting for your confirmation." });

    const now = new Date();
    const result = await db.collection("servicerequests").updateOne(
      { _id: requestId, customer: req.user._id, status: "awaiting_customer_confirmation" },
      { $set: { status: "awaiting_payment", paymentStatus: "due", customerConfirmedAt: now, updatedAt: now } }
    );
    if (!result.modifiedCount) return res.status(409).json({ success: false, message: "This request has already changed." });

    // Notify provider
    await db.collection("notifications").insertOne({
      _id: new mongoose.Types.ObjectId(),
      user: request.provider,
      request: requestId,
      type: "customer_confirmed",
      title: "Customer confirmed task completion",
      message: `Customer verified and confirmed completion of ${serializeRequest(request).id}. Payment of Rs. ${Number(request.amount || 0).toLocaleString("en-LK")} is due.`,
      createdAt: now,
      readAt: null,
    });

    return res.json({ success: true, message: "Task completion verified! Please proceed to complete the payment." });
  } catch (error) {
    return next(error);
  }
}

async function rejectCompletionServiceRequest(req, res, next) {
  try {
    const requestId = parseRequestId(req.params.id);
    const reason = req.body?.reason?.trim() || "Work was not completed as expected";
    if (!requestId) return res.status(400).json({ success: false, message: "Invalid service request." });

    const db = mongoose.connection.db;
    const request = await db.collection("servicerequests").findOne({
      _id: requestId,
      customer: req.user._id,
      status: "awaiting_customer_confirmation",
    });
    if (!request) return res.status(409).json({ success: false, message: "This request is not waiting for your confirmation." });

    const now = new Date();

    // Revert status back to in_progress with dispute/rejection reason
    await db.collection("servicerequests").updateOne(
      { _id: requestId, customer: req.user._id, status: "awaiting_customer_confirmation" },
      { $set: { status: "in_progress", completionRejectedReason: reason, updatedAt: now } }
    );

    // Cancel pending invoice if any
    if (request.invoice) {
      await db.collection("invoices").deleteOne({ _id: request.invoice, status: "pending" });
    }

    // Notify provider that customer indicated work is NOT complete
    await db.collection("notifications").insertOne({
      _id: new mongoose.Types.ObjectId(),
      user: request.provider,
      request: requestId,
      type: "completion_rejected",
      title: "Customer reported task NOT completed",
      message: `Customer reported that ${serializeRequest(request).id} is not yet completed. Feedback: "${reason}". Please follow up with the customer.`,
      createdAt: now,
      readAt: null,
    });

    return res.json({ success: true, message: "You reported the task as not completed. The provider has been notified." });
  } catch (error) {
    return next(error);
  }
}

async function payServiceRequest(req, res, next) {
  try {
    const requestId = parseRequestId(req.params.id);
    const { paymentMethod = "Credit / Debit Card" } = req.body || {};
    if (!requestId) return res.status(400).json({ success: false, message: "Invalid service request." });

    const db = mongoose.connection.db;
    const request = await db.collection("servicerequests").findOne({
      _id: requestId,
      customer: req.user._id,
      status: "awaiting_payment",
    });
    if (!request) return res.status(409).json({ success: false, message: "This request is not awaiting payment." });

    const now = new Date();
    const amount = Number(request.amount || 0);

    // Ensure invoice exists and is marked as paid
    let invoiceId = request.invoice;
    if (invoiceId) {
      await db.collection("invoices").updateOne(
        { _id: invoiceId },
        {
          $set: {
            status: "paid",
            paymentMethod,
            paidAt: now,
            updatedAt: now,
            provider: request.provider,
            customer: req.user._id,
            paidBy: req.user._id,
            total: amount,
            providerAmount: amount,
          },
        }
      );
    } else {
      invoiceId = new mongoose.Types.ObjectId();
      await db.collection("invoices").insertOne({
        _id: invoiceId,
        request: requestId,
        customer: req.user._id,
        paidBy: req.user._id,
        provider: request.provider,
        total: amount,
        providerAmount: amount,
        status: "paid",
        paymentMethod,
        paidAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Update service request to completed and paid
    await db.collection("servicerequests").updateOne(
      { _id: requestId, customer: req.user._id, status: "awaiting_payment" },
      {
        $set: {
          status: "completed",
          paymentStatus: "paid",
          paidAt: now,
          paymentMethod,
          invoice: invoiceId,
          updatedAt: now,
        },
      }
    );

    // Notify provider
    await db.collection("notifications").insertOne({
      _id: new mongoose.Types.ObjectId(),
      user: request.provider,
      request: requestId,
      type: "customer_paid",
      title: "Payment received!",
      message: `Payment of Rs. ${amount.toLocaleString("en-LK")} received via ${paymentMethod} for ${serializeRequest(request).id}. Added to your earnings.`,
      createdAt: now,
      readAt: null,
    });

    // Notify customer
    await db.collection("notifications").insertOne({
      _id: new mongoose.Types.ObjectId(),
      user: req.user._id,
      request: requestId,
      type: "payment_success",
      title: "Payment successful",
      message: `Your payment of Rs. ${amount.toLocaleString("en-LK")} via ${paymentMethod} for ${serializeRequest(request).id} was processed successfully.`,
      createdAt: now,
      readAt: null,
    });

    return res.json({
      success: true,
      message: `Payment of Rs. ${amount.toLocaleString("en-LK")} successfully processed via ${paymentMethod}.`,
    });
  } catch (error) {
    return next(error);
  }
}

async function cancelServiceRequest(req, res, next) {
  try {
    const requestId = parseRequestId(req.params.id);
    const reason = req.body?.reason?.trim() || "Cancelled by customer";
    if (!requestId) return res.status(400).json({ success: false, message: "Invalid service request." });

    const db = mongoose.connection.db;
    const isStaff = ["admin", "ops_manager"].includes(req.user?.role);
    const filter = {
      _id: requestId,
      status: { $in: ["open_for_quotes", "accepted"] },
    };
    if (!isStaff) {
      filter.customer = req.user._id;
    }

    const request = await db.collection("servicerequests").findOne(filter);
    if (!request) {
      return res.status(409).json({ success: false, message: "Only open or accepted requests can be cancelled." });
    }

    const now = new Date();
    await db.collection("servicerequests").updateOne(
      { _id: requestId },
      { $set: { status: "cancelled", cancelReason: reason, cancelledAt: now, updatedAt: now } }
    );

    // If a provider was already assigned, notify them
    if (request.provider) {
      await db.collection("notifications").insertOne({
        _id: new mongoose.Types.ObjectId(),
        user: request.provider,
        request: requestId,
        type: "request_cancelled",
        title: "Service request cancelled",
        message: `Customer cancelled request ${serializeRequest(request).id}. Reason: "${reason}".`,
        createdAt: now,
        readAt: null,
      });
    }

    return res.json({ success: true, message: "Service request has been cancelled." });
  } catch (error) {
    return next(error);
  }
}

async function reviewServiceRequest(req, res, next) {
  try {
    const requestId = parseRequestId(req.params.id);
    const rating = Math.round(Number(req.body?.rating));
    const reviewText = req.body?.reviewText?.trim() || "";

    if (!requestId) return res.status(400).json({ success: false, message: "Invalid service request." });
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Please provide a rating between 1 and 5 stars." });
    }

    const db = mongoose.connection.db;
    const request = await db.collection("servicerequests").findOne({
      _id: requestId,
      customer: req.user._id,
      status: "completed",
    });
    if (!request) {
      return res.status(409).json({ success: false, message: "Only completed service requests can be reviewed." });
    }
    if (request.rating) {
      return res.status(409).json({ success: false, message: "You have already reviewed this service request." });
    }

    const now = new Date();
    await db.collection("servicerequests").updateOne(
      { _id: requestId, customer: req.user._id, status: "completed" },
      { $set: { rating, reviewText, reviewedAt: now, updatedAt: now } }
    );

    // Record review in reviews collection
    await db.collection("reviews").insertOne({
      _id: new mongoose.Types.ObjectId(),
      request: requestId,
      customer: req.user._id,
      provider: request.provider,
      rating,
      comment: reviewText,
      createdAt: now,
    });

    // Update provider profile rating average and count
    if (request.provider) {
      const profile = await db.collection("providerprofiles").findOne({ user: request.provider });
      if (profile) {
        const currentCount = Number(profile.ratingCount || 0);
        const currentAvg = Number(profile.ratingAvg || 5.0);
        const newCount = currentCount + 1;
        const newAvg = Number(((currentAvg * currentCount + rating) / newCount).toFixed(1));

        await db.collection("providerprofiles").updateOne(
          { _id: profile._id },
          { $set: { ratingAvg: newAvg, ratingCount: newCount, updatedAt: now } }
        );
      }

      // Notify provider about the new review
      await db.collection("notifications").insertOne({
        _id: new mongoose.Types.ObjectId(),
        user: request.provider,
        request: requestId,
        type: "customer_reviewed",
        title: "New Customer Review",
        message: `Customer rated your work ${rating} ★: "${reviewText || "Great service!"}"`,
        createdAt: now,
        readAt: null,
      });
    }

    return res.json({ success: true, message: `Thank you! Your ${rating}-star review has been recorded.` });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  acceptServiceRequest,
  cancelServiceRequest,
  completeServiceRequest,
  confirmServiceRequest,
  createServiceRequest,
  listServiceRequests,
  payServiceRequest,
  rejectCompletionServiceRequest,
  reviewServiceRequest,
  startServiceRequest,
};