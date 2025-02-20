const Content = require("../models/content");
const moderateContent = require("../services/AIAnalyzer");
const uploadFile = require("../services/AWS");
const logger = require("../config/logger");

class ContentAnalyzer {
  async createContent(req, res) {
    try {
      const { type } = req.body;
      const userID = req.user._id;

      logger.info("Content creation initiated", {
        action: "CREATE_CONTENT_START",
        userId: userID,
        contentType: type,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        timestamp: new Date(),
        suspicionLevel: "none",
      });

      console.log("Request body:", req.body);
      console.log("Request file:", req.file);
      console.log("User:", req.user);

      // Check if user is banned
      if (req.user.baned) {
        return res.status(403).json({
          message: "You are banned and cannot create content",
        });
      }

      let content;

      if (type === "file") {
        if (!req.file) {
          return res.status(400).json({
            message: "No file uploaded",
          });
        }

        try {
          const imageURL = await uploadFile(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype
          );
          content = imageURL;

          const result = await moderateContent(content, type);

          logger.info("Content moderation completed", {
            action: "CONTENT_MODERATION",
            userId: userID,
            contentType: type,
            classification: result.classification,
            moderationScore: result.moderationScore,
            timestamp: new Date(),
            suspicionLevel:
              result.classification === "Harmful"
                ? "high"
                : result.classification === "Warning"
                ? "medium"
                : "none",
            suspicionReason:
              result.classification !== "Safe" ? result.reason : undefined,
          });

          const contentObj = new Content({
            userID,
            content: imageURL,
            type,
            classification: result.classification,
            moderationScore: result.moderationScore,
            reason: result.reason,
          });

          await contentObj.save();

          logger.info("Content created successfully", {
            action: "CREATE_CONTENT_SUCCESS",
            userId: userID,
            contentId: contentObj._id,
            contentType: type,
            classification: result.classification,
            timestamp: new Date(),
          });

          return res.status(200).json({
            message: "File uploaded and analyzed successfully",
            contentObj,
          });
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
          return res.status(500).json({
            message: "Error uploading file",
            error: uploadError.message,
          });
        }
      } else {
        content = req.body.content;
        const result = await moderateContent(content, type);

        logger.info("Content moderation completed", {
          action: "CONTENT_MODERATION",
          userId: userID,
          contentType: type,
          classification: result.classification,
          moderationScore: result.moderationScore,
          timestamp: new Date(),
          suspicionLevel:
            result.classification === "Harmful"
              ? "high"
              : result.classification === "Warning"
              ? "medium"
              : "none",
          suspicionReason:
            result.classification !== "Safe" ? result.reason : undefined,
        });

        const contentObj = new Content({
          userID,
          content,
          type,
          classification: result.classification,
          moderationScore: result.moderationScore,
          reason: result.reason,
        });

        await contentObj.save();

        logger.info("Content created successfully", {
          action: "CREATE_CONTENT_SUCCESS",
          userId: userID,
          contentId: contentObj._id,
          contentType: type,
          classification: result.classification,
          timestamp: new Date(),
        });

        return res.status(200).json({
          message: "Content analyzed successfully",
          contentObj,
        });
      }
    } catch (error) {
      logger.error("Content creation error", {
        action: "CREATE_CONTENT_ERROR",
        userId: req.user._id,
        error: error.message,
        stack: error.stack,
        timestamp: new Date(),
      });
      console.error("Analysis error:", error);
      return res.status(500).json({
        message: "Error analyzing content",
        error: error.message,
      });
    }
  }

  async getAllContent(req, res) {
    try {
      logger.info("Fetching all content", {
        action: "GET_ALL_CONTENT",
        userId: req.user._id,
        timestamp: new Date(),
      });

      const content = await Content.find({ userID: req.user._id });
      res.status(200).json({
        message: "Content fetched successfully",
        content,
      });
    } catch (error) {
      logger.error("Error fetching content", {
        action: "GET_ALL_CONTENT_ERROR",
        userId: req.user._id,
        error: error.message,
        stack: error.stack,
        timestamp: new Date(),
      });
      res.status(500).json({
        message: "Error fetching content",
        error: error.message,
      });
    }
  }

  async getSafeContent(req, res) {
    try {
      const content = await Content.find({
        userID: req.user._id,
        classification: "Safe",
      });

      res.status(200).json({
        message: "Safe content fetched successfully",
        content,
      });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching safe content",
        error: error.message,
      });
    }
  }

  async getWarningContent(req, res) {
    try {
      const content = await Content.find({
        userID: req.user._id,
        classification: "Warning",
      });

      res.status(200).json({
        message: "Warning content fetched successfully",
        content,
      });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching warning content",
        error: error.message,
      });
    }
  }

  async getHarmfulContent(req, res) {
    try {
      const content = await Content.find({
        userID: req.user._id,
        classification: "Harmful",
      });

      res.status(200).json({
        message: "Harmful content fetched successfully",
        content,
      });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching harmful content",
        error: error.message,
      });
    }
  }
}

module.exports = new ContentAnalyzer();
