const Invoice = require("../models/Invoice");
const Job = require("../models/Job");
const Booking = require("../models/Booking");
const ProviderProfile = require("../models/ProviderProfile");
const { notify } = require("../services/notification.service");

async function canAccessInvoiceBooking(booking, user) {
  if (["admin", "ops_manager", "support_agent"].includes(user.role)) return true;
  if (String(booking.customer) === String(user._id)) return true;
  if (user.role === "provider") {
    const profile = await ProviderProfile.findOne({ user: user._id }).select("_id");
    return profile && String(booking.provider) === String(profile._id);
  }
  return false;
}
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// GET /api/v1/bookings/:id/invoice
const getInvoiceForBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return next(new AppError("Booking not found.", 404));
  if (!(await canAccessInvoiceBooking(booking, req.user))) return next(new AppError("You do not have permission to view this invoice.", 403));
  const invoice = await Invoice.findOne({ booking: req.params.id });
  if (!invoice) return next(new AppError("Invoice not found.", 404));
  res.status(200).json({ success: true, data: invoice });
});

// POST /api/v1/bookings/:id/invoice  [provider, ops] - issue an invoice
const createInvoice = catchAsync(async (req, res, next) => {
  const { lineItems, tax } = req.body; // lineItems: [{ description, amount }]
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return next(new AppError("lineItems must be a non-empty array.", 400));
  }

  const job = await Job.findOne({ booking: req.params.id });
  if (!job) return next(new AppError("Job not found for this booking.", 404));
  if (!["completed", "customer_confirmed"].includes(job.status)) {
    return next(new AppError("The provider must complete the job before an invoice can be issued.", 400));
  }

  const booking = await Booking.findById(req.params.id);
  if (!booking) return next(new AppError("Booking not found.", 404));
  if (!(await canAccessInvoiceBooking(booking, req.user))) return next(new AppError("You do not have permission to issue this invoice.", 403));
  if (req.user.role === "provider" && !(await canAccessInvoiceBooking(booking, req.user))) return next(new AppError("Only the assigned provider can issue this invoice.", 403));

  const existing = await Invoice.findOne({ booking: req.params.id });
  if (existing) return next(new AppError("An invoice already exists for this booking.", 400));

  const subtotal = lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const taxAmount = Number(tax || 0);
  const total = subtotal + taxAmount;

  const invoice = await Invoice.create({
    job: job._id,
    booking: req.params.id,
    lineItems: lineItems.map((item) => ({ ...item, hoursWorked: job.hoursWorked || 0 })),
    subtotal,
    tax: taxAmount,
    total,
    status: "issued",
  });

  res.status(201).json({ success: true, data: invoice });
});

// PATCH /api/v1/invoices/:id/pay  [customer]
const payInvoice = catchAsync(async (req, res, next) => {
  const { paymentMethod = "demo_card" } = req.body;
  if (!["demo_card", "cash"].includes(paymentMethod)) {
    return next(new AppError("paymentMethod must be demo_card or cash.", 400));
  }

  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return next(new AppError("Invoice not found.", 404));
  const booking = await Booking.findById(invoice.booking).populate("provider", "user");
  if (!booking) return next(new AppError("Booking not found.", 404));
  if (String(booking.customer) !== String(req.user._id)) return next(new AppError("You do not have permission to pay this invoice.", 403));
  const job = await Job.findById(invoice.job);
  if (!job || job.status !== "customer_confirmed") return next(new AppError("Confirm the completed job before paying this invoice.", 400));
  if (invoice.status === "paid") return next(new AppError("This invoice has already been paid.", 400));

  const platformFee = Number((invoice.total * 0.1).toFixed(2));
  invoice.status = "paid";
  invoice.paidAt = new Date();
  invoice.paymentMethod = paymentMethod;
  invoice.transactionId = `CC-${Date.now()}-${invoice._id.toString().slice(-6).toUpperCase()}`;
  invoice.paidBy = req.user._id;
  invoice.platformFee = platformFee;
  invoice.providerAmount = Number((invoice.total - platformFee).toFixed(2));
  await invoice.save();

  if (booking.provider?.user) {
    await notify(booking.provider.user, "payment_received", `Payment received: Rs. ${invoice.total}. Your provider earnings are Rs. ${invoice.providerAmount}.`, {
      type: "Invoice",
      id: invoice._id,
    });
  }

  res.status(200).json({ success: true, data: invoice });
});

module.exports = { getInvoiceForBooking, createInvoice, payInvoice };
