const User = require("../models/user");
const bcrypt = require("bcrypt");
const logger = require("../config/logger");
const jwt = require("jsonwebtoken");

class Authentication {
  async register(req, res) {
    try {
      const { email, password, name } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          message: "Please provide all required fields: name, email, password",
        });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          message: "User with this email already exists",
        });
      }

      const hashedPass = await bcrypt.hash(password, 10);

      const user = await User.create({
        email,
        password: hashedPass,
        name,
        role: "user",
      });

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "24h" }
      );

      logger.info("User registration attempt", {
        action: "REGISTER_ATTEMPT",
        email: email,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        timestamp: new Date(),
        suspicionLevel: "none",
      });

      logger.info("User registered successfully", {
        action: "REGISTER_SUCCESS",
        userId: user._id,
        email: user.email,
        name: user.name,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        timestamp: new Date(),
        suspicionLevel: "none",
      });

      res.status(201).json({
        message: "User registered successfully",
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      });
    } catch (error) {
      logger.error("Registration error", {
        action: "REGISTER_ERROR",
        error: error.message,
        stack: error.stack,
        timestamp: new Date(),
      });
      return res.status(500).json({
        message: "Error registering user",
        error: error.message,
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          message: "Please provide both email and password",
        });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "24h" }
      );

      logger.info("User login attempt", {
        action: "LOGIN_ATTEMPT",
        email: email,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        timestamp: new Date(),
        suspicionLevel: loginAttempts > 3 ? "medium" : "none",
        suspicionReason:
          loginAttempts > 3 ? "Multiple login attempts" : undefined,
      });

      logger.info("User logged in", {
        action: "LOGIN",
        userId: user._id,
        email: user.email,
        timestamp: new Date(),
      });

      res.status(200).json({
        message: "Login successful",
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      });
    } catch (error) {
      logger.error("Login error", {
        action: "LOGIN_ERROR",
        error: error.message,
        stack: error.stack,
        timestamp: new Date(),
      });
      return res.status(500).json({
        message: "Error during login",
        error: error.message,
      });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          message: "Please provide an email address",
        });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          message: "No account found with this email",
        });
      }

      const resetToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "1h" }
      );

      user.resetToken = resetToken;
      user.resetTokenExpiry = Date.now() + 3600000;
      await user.save();

      res.status(200).json({
        message: "Password reset token generated successfully",
        resetToken,
      });
    } catch (error) {
      console.error("Password reset error:", error);
      return res.status(500).json({
        message: "Error during password reset",
        error: error.message,
      });
    }
  }

  async resetPassword(req, res) {
    try {
      const { resetToken, newPassword } = req.body;

      if (!resetToken || !newPassword) {
        return res.status(400).json({
          message: "Please provide reset token and new password",
        });
      }

      const user = await User.findOne({
        resetToken: resetToken,
        resetTokenExpiry: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(401).json({
          message: "Invalid or expired reset token",
        });
      }

      // Hash new password and update user
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
      await user.save();

      res.status(200).json({
        message: "Password reset successful",
      });
    } catch (error) {
      console.error("Password reset error:", error);
      return res.status(500).json({
        message: "Error resetting password",
        error: error.message,
      });
    }
  }
}

module.exports = new Authentication();
