const ServiceCategory = require("../models/ServiceCategory");
const AuditLog = require("../models/AuditLog");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// GET /api/v1/categories  [public]
const getCategories = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.isActive) filter.isActive = req.query.isActive === "true";

  const categories = await ServiceCategory.find(filter);
  res.status(200).json({ success: true, count: categories.length, data: categories });
});

// GET /api/v1/categories/:id  [public]
const getCategoryById = catchAsync(async (req, res, next) => {
  const category = await ServiceCategory.findById(req.params.id);
  if (!category) return next(new AppError("Category not found.", 404));
  res.status(200).json({ success: true, data: category });
});

// POST /api/v1/categories  [admin]
const createCategory = catchAsync(async (req, res) => {
  const category = await ServiceCategory.create(req.body);

  await AuditLog.create({
    actor: req.user._id,
    action: "category.create",
    entityType: "ServiceCategory",
    entityId: category._id,
    details: req.body,
  });

  res.status(201).json({ success: true, data: category });
});

// PATCH /api/v1/categories/:id  [admin]
const updateCategory = catchAsync(async (req, res, next) => {
  const category = await ServiceCategory.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!category) return next(new AppError("Category not found.", 404));

  await AuditLog.create({
    actor: req.user._id,
    action: "category.update",
    entityType: "ServiceCategory",
    entityId: category._id,
    details: req.body,
  });

  res.status(200).json({ success: true, data: category });
});

// DELETE /api/v1/categories/:id  [admin]
const deleteCategory = catchAsync(async (req, res, next) => {
  const category = await ServiceCategory.findByIdAndDelete(req.params.id);
  if (!category) return next(new AppError("Category not found.", 404));

  await AuditLog.create({
    actor: req.user._id,
    action: "category.delete",
    entityType: "ServiceCategory",
    entityId: req.params.id,
    details: {},
  });

  res.status(200).json({ success: true, message: "Category deleted." });
});

module.exports = { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory };
