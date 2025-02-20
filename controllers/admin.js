const User = require("../models/user");
const Content = require("../models/content");
const logger = require("../config/logger");
const Log = require("../models/log");

class Admin {
  async getAllUser(req, res) {
    try {
      const users = await User.find({});
      res.status(200).json({
        message: "Users fetched successfully",
        users: users.map((user) => ({
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        })),
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({
        message: "Error fetching users",
        error: error.message,
      });
    }
  }

  async getAllContentofUser(req, res) {
    let userID = req.body.userID;
    try {
      const content = await Content.find({ userID });
      res.status(200).json({
        message: "Content fetched successfully",
        content,
      });
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({
        message: "Error fetching content",
        error: error.message,
      });
    }
  }

  async getHarmfullContent(req, res) {
    try {
      const content = await Content.find({ classification: "Harmful" });
      res.status(200).json({
        message: "Harmful content fetched successfully",
        content,
      });
    } catch (error) {
      console.error("Error fetching harmful content:", error);
      res.status(500).json({
        message: "Error fetching harmful content",
        error: error.message,
      });
    }
  }

  async removeContent(req, res) {
    try {
      const { contentId } = req.body;

      if (!contentId) {
        return res.status(400).json({
          message: "Content ID is required",
        });
      }

      const deletedContent = await Content.findByIdAndDelete(contentId);

      if (!deletedContent) {
        return res.status(404).json({
          message: "Content not found",
        });
      }

      res.status(200).json({
        message: "Content removed successfully",
        deletedContent,
      });
    } catch (error) {
      console.error("Error removing content:", error);
      res.status(500).json({
        message: "Error removing content",
        error: error.message,
      });
    }
  }

  async banUser(req, res) {
    try {
      const { userId, banDuration, banReason } = req.body;

      if (!userId) {
        return res.status(400).json({
          message: "User ID is required",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const duration = banDuration || 6;

      user.isBanned = true;
      user.banDuration = duration;
      user.bannedAt = new Date();
      user.banReason = banReason || "No reason provided";

      await user.save();

      logger.info("User banned successfully", {
        action: "ADMIN_BAN_SUCCESS",
        adminId: req.user._id,
        targetUserId: userId,
        banDuration: duration,
        timestamp: new Date(),
      });

      res.status(200).json({
        message: "User banned successfully",
        user: {
          id: user._id,
          email: user.email,
          banDuration: user.banDuration,
          bannedAt: user.bannedAt,
          banReason: user.banReason,
        },
      });
    } catch (error) {
      logger.error("Error banning user", {
        action: "ADMIN_BAN_ERROR",
        adminId: req.user._id,
        targetUserId: req.body.userId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date(),
      });
      res.status(500).json({
        message: "Error banning user",
        error: error.message,
      });
    }
  }

  async getLogs(req, res) {
    try {
      const {
        startDate,
        endDate,
        level,
        action,
        userId,
        limit = 100,
        page = 1,
      } = req.query;

      const query = {};

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      if (level) query.level = level;
      if (action) query.action = action;
      if (userId) query.userId = userId;

      const skip = (page - 1) * limit;

      const logs = await Log.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("userId", "email name");

      const total = await Log.countDocuments(query);

      logger.info("Logs retrieved", {
        action: "GET_LOGS",
        adminId: req.user._id,
        query: req.query,
        timestamp: new Date(),
      });

      res.status(200).json({
        message: "Logs retrieved successfully",
        logs,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error("Error retrieving logs", {
        action: "GET_LOGS_ERROR",
        adminId: req.user._id,
        error: error.message,
        stack: error.stack,
        timestamp: new Date(),
      });
      res.status(500).json({
        message: "Error retrieving logs",
        error: error.message,
      });
    }
  }
}

module.exports = new Admin();
