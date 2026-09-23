const express = require("express");
const { getAllUsers, getUserById, updateUser, updateUserStatus, deleteUser } = require("../controllers/user.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", authorize("admin"), getAllUsers);
router.get("/:id", getUserById); // any logged-in user can view a profile by id
router.patch("/:id", updateUser); // ownership check is simple: in a real app, verify req.user.id === req.params.id unless admin
router.patch("/:id/status", authorize("admin"), updateUserStatus);
router.delete("/:id", authorize("admin"), deleteUser);

module.exports = router;
