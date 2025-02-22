const moderateContent = require("../services/AIAnalyzer");
const uploadFile = require("../services/AWS");
const logger = require("../config/logger");

class ContentAnalyzer {
  async analyze(req, res) {
    try {
      if (!req.body) {
        return res.status(400).json({
          message: "Request body is required",
        });
      }

      const { type, userID, content: textContent } = req.body;

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
        contentType: type,
        contentUrl: type === "file" ? content : undefined,
        classification: result.classification,
        moderationScore: result.moderationScore,
        reason: result.reason,
        timestamp: new Date(),
        suspicionLevel:
          result.classification === "Harmful"
            ? "high"
            : result.classification === "Warning"
            ? "medium"
            : "none",
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        rawResult: result,
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
        action: "ANALYZE_CONTENT_ERROR",
        userId: req.body?.userID || "unknown",
        error: error?.message || "Unknown error",
        stack: error?.stack || "No stack trace",
        timestamp: new Date(),
      });

      return res.status(500).json({
        message: "Error analyzing content",
        error: error?.message || "Unknown error",
      });
    }
  }
}

module.exports = new ContentAnalyzer();
