const Quote = require("../models/Quote");
const ServiceRequest = require("../models/ServiceRequest");
const ProviderProfile = require("../models/ProviderProfile");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { notify } = require("../services/notification.service");
const { providerMatchesRequest, summarizeQuote } = require("../services/ai.service");

function isOperationsRole(role) {
  return ["admin", "ops_manager", "support_agent"].includes(role);
}

// POST /api/v1/service-requests/:id/quotes  [provider]
const createQuote = catchAsync(async (req, res, next) => {
  const { price, estimatedDurationMins, message } = req.body;
  if (!price) return next(new AppError("price is required.", 400));

  const request = await ServiceRequest.findById(req.params.id);
  if (!request) return next(new AppError("Service request not found.", 404));
  if (!["pending_classification", "open_for_quotes", "quoted"].includes(request.status)) {
    return next(new AppError("This request is not open for quotes.", 400));
  }

  const providerProfile = await ProviderProfile.findOne({ user: req.user._id });
  if (!providerProfile) return next(new AppError("Provider profile not found.", 404));
  if (!providerMatchesRequest(providerProfile, request)) return next(new AppError("This request is not matched to your listed skills.", 403));

  const existingQuote = await Quote.findOne({ serviceRequest: request._id, provider: providerProfile._id });
  if (existingQuote) return next(new AppError("You have already submitted a quote for this request.", 400));

  const quote = await Quote.create({
    serviceRequest: request._id,
    provider: providerProfile._id,
    price,
    estimatedDurationMins,
    message,
    aiSummary: summarizeQuote({ price, estimatedDurationMins, message }, request),
  });

  request.status = "quoted";
  await request.save();

  await notify(
    request.customer,
    "quote_received",
    `You received a new quote of $${price} on your service request.`,
    { type: "Quote", id: quote._id }
  );

  res.status(201).json({ success: true, data: quote });
});

// GET /api/v1/service-requests/:id/quotes  [customer, ops]
const getQuotesForRequest = catchAsync(async (req, res) => {
  const request = await ServiceRequest.findById(req.params.id).select("customer");
  if (!request) throw new AppError("Service request not found.", 404);
  if (!isOperationsRole(req.user.role) && String(request.customer) !== String(req.user._id)) {
    throw new AppError("You do not have permission to view these quotes.", 403);
  }
  const quotes = await Quote.find({ serviceRequest: req.params.id })
    .populate({ path: "provider", populate: { path: "user", select: "name email" } })
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: quotes.length, data: quotes });
});

// PATCH /api/v1/quotes/:id/reject  [customer]
const rejectQuote = catchAsync(async (req, res, next) => {
  const quote = await Quote.findById(req.params.id);
  if (!quote) return next(new AppError("Quote not found.", 404));

  const request = await ServiceRequest.findById(quote.serviceRequest).select("customer");
  if (!request || String(request.customer) !== String(req.user._id)) {
    return next(new AppError("You do not have permission to reject this quote.", 403));
  }

  quote.status = "rejected";
  await quote.save();

  res.status(200).json({ success: true, data: quote });
});

// PATCH /api/v1/quotes/:id/withdraw  [provider]
const withdrawQuote = catchAsync(async (req, res, next) => {
  const quote = await Quote.findById(req.params.id);
  if (!quote) return next(new AppError("Quote not found.", 404));

  const provider = await ProviderProfile.findOne({ user: req.user._id });
  if (!provider || String(quote.provider) !== String(provider._id)) {
    return next(new AppError("You do not have permission to withdraw this quote.", 403));
  }

  quote.status = "withdrawn";
  await quote.save();

  res.status(200).json({ success: true, data: quote });
});

module.exports = { createQuote, getQuotesForRequest, rejectQuote, withdrawQuote };
