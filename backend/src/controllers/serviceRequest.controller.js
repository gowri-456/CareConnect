const ServiceRequest = require("../models/ServiceRequest");
const ServiceCategory = require("../models/ServiceCategory");
const ProviderProfile = require("../models/ProviderProfile");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { classifyRequest, rankProviders, providerMatchesRequest } = require("../services/ai.service");
const { notify } = require("../services/notification.service");

function validateAttachments(attachments) {
  if (!Array.isArray(attachments)) return true;
  return attachments.length <= 5 && attachments.every((url) => typeof url === "string" && (url.startsWith("data:image/") || /^https?:\/\//i.test(url)) && url.length <= 2_500_000);
}

async function notifyMatchingProviders(serviceRequest) {
  const providers = await ProviderProfile.find({ verificationStatus: "verified", isAvailableForWork: true });
  const matching = providers.filter((provider) => providerMatchesRequest(provider, serviceRequest));
  await Promise.all(matching.map((provider) => notify(provider.user, "request_available", "A service request matching your skills is available.", { type: "ServiceRequest", id: serviceRequest._id })));
}

// POST /api/v1/service-requests  [customer]
// Creates the request AND immediately runs the AI classifier against it.
const createServiceRequest = catchAsync(async (req, res, next) => {
  const { descriptionText, location, preferredDate, urgency, attachments } = req.body;
  if (!descriptionText?.trim()) return next(new AppError("descriptionText is required.", 400));
  if (!validateAttachments(attachments)) return next(new AppError("Use up to 5 valid image URLs or image files.", 400));

  const categories = await ServiceCategory.find({ isActive: true });
  const aiResult = classifyRequest(descriptionText, categories);

  const serviceRequest = await ServiceRequest.create({
    customer: req.user._id,
    descriptionText: descriptionText.trim(),
    location,
    preferredDate,
    urgency,
    attachments,
    category: aiResult.categoryId, // AI's best guess; ops/admin can override later
    aiClassification: {
      category: aiResult.category,
      confidence: aiResult.confidence,
      suggestedSkills: aiResult.suggestedSkills,
    },
    status: aiResult.category ? "open_for_quotes" : "pending_classification",
    activity: [{ type: "created", message: "Request created.", actor: req.user._id }],
  });

  if (aiResult.categoryId) await notifyMatchingProviders(serviceRequest);

  res.status(201).json({ success: true, data: serviceRequest });
});

// GET /api/v1/service-requests  [ops, admin] - all requests, with filters
const getAllServiceRequests = catchAsync(async (req, res) => {
  const filter = {};
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  if (req.user.role === "provider") {
    filter.status = { $in: ["pending_classification", "open_for_quotes", "quoted"] };
  } else if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.category) filter.category = req.query.category;

  let requests = await ServiceRequest.find(filter)
    .populate("customer", "name email")
    .populate("category", "name")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  if (req.user.role === "provider") {
    const providerProfile = await ProviderProfile.findOne({ user: req.user._id });
    const providerSkills = (providerProfile?.skills || []).map((skill) => skill.toLowerCase());
    requests = requests.filter((serviceRequest) => providerMatchesRequest({ skills: providerSkills }, serviceRequest));
  }

  const total = await ServiceRequest.countDocuments(filter);
  res.status(200).json({ success: true, count: requests.length, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, data: requests });
});

// GET /api/v1/service-requests/mine  [customer]
const getMyServiceRequests = catchAsync(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const requests = await ServiceRequest.find({ customer: req.user._id })
    .populate("category", "name")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  const total = await ServiceRequest.countDocuments({ customer: req.user._id });
  res.status(200).json({ success: true, count: requests.length, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, data: requests });
});

// GET /api/v1/service-requests/:id
const getServiceRequestById = catchAsync(async (req, res, next) => {
  const request = await ServiceRequest.findById(req.params.id)
    .populate("customer", "name email phone")
    .populate("category", "name")
    .populate("activity.actor", "name role");
  if (!request) return next(new AppError("Service request not found.", 404));
  if (req.user.role === "customer" && String(request.customer._id) !== String(req.user._id)) {
    return next(new AppError("You do not have permission to view this request.", 403));
  }
  if (req.user.role === "provider") {
    const providerProfile = await ProviderProfile.findOne({ user: req.user._id });
    if (!providerMatchesRequest(providerProfile, request)) return next(new AppError("This request is not matched to your listed skills.", 403));
  }
  res.status(200).json({ success: true, data: request });
});

// POST /api/v1/service-requests/:id/classify  [ops, admin] - re-run or manually trigger AI classification
const classifyServiceRequest = catchAsync(async (req, res, next) => {
  const request = await ServiceRequest.findById(req.params.id);
  if (!request) return next(new AppError("Service request not found.", 404));

  const categories = await ServiceCategory.find({ isActive: true });
  const aiResult = classifyRequest(request.descriptionText, categories);

  request.category = aiResult.categoryId;
  request.aiClassification = {
    category: aiResult.category,
    confidence: aiResult.confidence,
    suggestedSkills: aiResult.suggestedSkills,
  };
  if (aiResult.category && request.status === "pending_classification") {
    request.status = "open_for_quotes";
  }
  await request.save();

  res.status(200).json({ success: true, data: request });
});

// PATCH /api/v1/service-requests/:id [customer]
const updateServiceRequest = catchAsync(async (req, res, next) => {
  const serviceRequest = await ServiceRequest.findOne({ _id: req.params.id, customer: req.user._id });
  if (!serviceRequest) return next(new AppError("Service request not found.", 404));
  if (!["pending_classification", "open_for_quotes"].includes(serviceRequest.status)) {
    return next(new AppError("This request can no longer be edited.", 400));
  }

  const { descriptionText, location, preferredDate, urgency, attachments } = req.body;
  if (!descriptionText?.trim()) return next(new AppError("descriptionText is required.", 400));
  if (!validateAttachments(attachments)) return next(new AppError("Use up to 5 valid image URLs or image files.", 400));
  const categories = await ServiceCategory.find({ isActive: true });
  const aiResult = classifyRequest(descriptionText, categories);

  serviceRequest.descriptionText = descriptionText.trim();
  serviceRequest.location = location || serviceRequest.location;
  serviceRequest.preferredDate = preferredDate || undefined;
  serviceRequest.urgency = urgency || serviceRequest.urgency;
  serviceRequest.attachments = Array.isArray(attachments) ? attachments : serviceRequest.attachments;
  serviceRequest.category = aiResult.categoryId;
  serviceRequest.aiClassification = { category: aiResult.category, confidence: aiResult.confidence, suggestedSkills: aiResult.suggestedSkills };
  serviceRequest.status = aiResult.category ? "open_for_quotes" : "pending_classification";
  serviceRequest.activity.push({ type: "updated", message: "Request details updated.", actor: req.user._id });
  await serviceRequest.save();
  if (aiResult.categoryId) await notifyMatchingProviders(serviceRequest);

  res.status(200).json({ success: true, data: serviceRequest });
});

// GET /api/v1/service-requests/:id/suggested-providers  [customer, ops] - AI ranking
const getSuggestedProviders = catchAsync(async (req, res, next) => {
  const request = await ServiceRequest.findById(req.params.id);
  if (!request) return next(new AppError("Service request not found.", 404));

  const filter = { verificationStatus: "verified" };
  if (request.location && request.location.city) {
    filter.serviceAreas = request.location.city;
  }

  const providers = await ProviderProfile.find(filter).populate("user", "name email");
  const requiredSkills = request.aiClassification.suggestedSkills || [];

  const ranked = rankProviders(providers, requiredSkills);

  res.status(200).json({
    success: true,
    count: ranked.length,
    data: ranked.map((r) => ({
      provider: r.provider,
      score: r.score,
      matchingSkills: r.matchingSkills,
    })),
  });
});

// PATCH /api/v1/service-requests/:id/cancel  [customer, ops]
const cancelServiceRequest = catchAsync(async (req, res, next) => {
  const filter = { _id: req.params.id };
  if (req.user.role === "customer") filter.customer = req.user._id;
  const request = await ServiceRequest.findOne(filter);
  if (!request) return next(new AppError("Service request not found.", 404));

  if (["booked", "completed"].includes(request.status)) {
    return next(new AppError("Cannot cancel a request that is already booked or completed.", 400));
  }

  request.status = "cancelled";
  request.activity.push({ type: "cancelled", message: "Request cancelled.", actor: req.user._id });
  await request.save();

  res.status(200).json({ success: true, data: request });
});

module.exports = {
  createServiceRequest,
  getAllServiceRequests,
  getMyServiceRequests,
  getServiceRequestById,
  classifyServiceRequest,
  updateServiceRequest,
  getSuggestedProviders,
  cancelServiceRequest,
};
