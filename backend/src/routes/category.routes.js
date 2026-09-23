const express = require("express");
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/category.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", getCategories); // public
router.get("/:id", getCategoryById); // public

router.post("/", authenticate, authorize("admin"), createCategory);
router.patch("/:id", authenticate, authorize("admin"), updateCategory);
router.delete("/:id", authenticate, authorize("admin"), deleteCategory);

module.exports = router;
