const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth");
const auth = require("../middleware/auth");

// Register new user
router.post("/register", authController.register);

// Login user
router.post("/login", authController.login);

// Request password reset
router.post("/forgot-password", authController.forgotPassword);

// Reset password with token
router.post("/reset-password", authController.resetPassword);

module.exports = router;
