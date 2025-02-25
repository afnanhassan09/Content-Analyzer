const moderateContent = require("../services/AIAnalyzer");
const uploadFile = require("../services/AWS");
const logger = require("../config/logger");
const Log = require("../models/log");

class ContentAnalyzer {
  async analyze(req, res) {
    try {
      if (!req.body) {
        return res.status(400).json({
          message: "Request body is required",
        });
      }

      const { type, userID, content: textContent } = req.body;
      console.log(textContent);
      if (!type || !["file", "comment", "post"].includes(type)) {
        return res.status(400).json({
          message:
            "Invalid or missing content type. Must be 'file' or 'comment' or 'post'",
        });
      }

      if (!userID || typeof userID !== "string") {
        return res.status(400).json({
          message: "Valid userID is required",
        });
      }

      let content;

      if (type === "file") {
        if (!req.file) {
          return res.status(400).json({
            message: "No file uploaded",
          });
        }

        const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif"];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
          return res.status(400).json({
            message:
              "Invalid file type. Only JPEG, PNG and GIF files are allowed",
          });
        }

        try {
          const imageURL = await uploadFile(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype
          );
          content = imageURL;
        } catch (uploadError) {
          logger.error("File upload error", {
            action: "FILE_UPLOAD_ERROR",
            userId: userID,
            error: uploadError.message,
            timestamp: new Date(),
          });
          return res.status(500).json({
            message: "Error uploading file",
            error: uploadError.message,
          });
        }
      } else {
        if (!textContent || typeof textContent !== "string") {
          return res.status(400).json({
            message: "Valid text content is required for text analysis",
          });
        }
        content = textContent;
      }

      const result = await moderateContent(content, type);

      logger.info("Content analyzed", {
        action: "CONTENT_ANALYSIS",
        userId: userID,
        message: `Content ${type === "file" ? "uploaded and " : ""}analyzed`,
        metadata: {
          contentType: type,
          contentUrl: type === "file" ? content : undefined,
          content: type !== "file" ? textContent : undefined,
          classification: result.classification,
          moderationScore: result.moderationScore,
          reason: result.reason,
          rawResult: result,
          suspicionLevel:
            result.classification === "Harmful"
              ? "high"
              : result.classification === "Warning"
              ? "medium"
              : "none",
          suspicionReason: result.reason,
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        },
        timestamp: new Date(),
      });

      return res.status(200).json({
        message: `Content ${
          type === "file" ? "uploaded and " : ""
        }analyzed successfully`,
        result: {
          classification: result.classification,
          moderationScore: result.moderationScore,
          reason: result.reason,
        },
      });
    } catch (error) {
      logger.error("Content analysis error", {
        action: "CONTENT_ANALYSIS_ERROR",
        userId: req.body?.userID || "unknown",
        message: "Error analyzing content",
        metadata: {
          error: error?.message || "Unknown error",
          stack: error?.stack || "No stack trace",
        },
        timestamp: new Date(),
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.status(500).json({
        message: "Error analyzing content",
        error: error?.message || "Unknown error",
      });
    }
  }

  async logUserActivity(req, res) {
    try {
      const {
        action,
        userId,
        metadata = {},
        timestamp = new Date(),
      } = req.body;

      // Validate required fields
      if (!action || !userId) {
        return res.status(400).json({
          message: "Action and userId are required fields",
        });
      }

      // Create the log entry
      const log = new Log({
        action,
        userId,
        timestamp,
        metadata,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        message: `User ${userId} performed action: ${action}`,
        level: "info",
      });

      // Save to MongoDB
      await log.save();

      logger.info("User activity logged", {
        action: "LOG_USER_ACTIVITY",
        userId,
        metadata: {
          actionType: action,
          ...metadata,
        },
        timestamp,
      });

      return res.status(201).json({
        message: "Activity logged successfully",
        log: {
          action,
          userId,
          timestamp,
          metadata,
        },
      });
    } catch (error) {
      logger.error("Error logging user activity", {
        action: "LOG_USER_ACTIVITY_ERROR",
        error: error.message,
        userId: req.body?.userId,
        timestamp: new Date(),
      });

      return res.status(500).json({
        message: "Error logging user activity",
        error: error.message,
      });
    }
  }
}

module.exports = new ContentAnalyzer();
