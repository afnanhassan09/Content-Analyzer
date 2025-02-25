const express = require("express");
const router = express.Router();
const aiLogAnalyzer = require("../services/aiLogAnalyzer");
const fs = require("fs/promises");
const logger = require("../config/logger");
const Log = require("../models/log");
const Content = require("../models/content");

router.get("/generate-report", async (req, res) => {
  try {
    const reportPaths = await aiLogAnalyzer.analyzeWeeklyLogs();

    // Read the report files
    const jsonReportContent = await fs.readFile(
      reportPaths.jsonReport,
      "utf-8"
    );
    const htmlReportContent = await fs.readFile(
      reportPaths.htmlReport,
      "utf-8"
    );

    // Send the report content in the response
    res.status(200).json({
      message: "Report generated successfully",
      jsonReport: JSON.parse(jsonReportContent),
      htmlReport: htmlReportContent,
    });
  } catch (error) {
    logger.error("Report generation error", {
      action: "REPORT_GENERATION_ERROR",
      error: error.message,
      stack: error.stack,
      timestamp: new Date(),
    });
    res
      .status(500)
      .json({ message: "Error generating report", error: error.message });
  }
});

router.get("/get-logs", async (req, res) => {
  try {
    const logs = await Log.find({}).sort({ timestamp: -1 });
    res.status(200).json(logs);
  } catch (error) {
    logger.error("Error fetching logs", {
      action: "FETCH_LOGS_ERROR",
      error: error.message,
    });
    res
      .status(500)
      .json({ message: "Error fetching logs", error: error.message });
  }
});

router.get("/get-suspicious-logs", async (req, res) => {
  try {
    const suspiciousLogs = await Log.find({
      suspicionLevel: { $in: ["medium", "high"] },
    });
    // Validate that logs were found
    if (!suspiciousLogs || suspiciousLogs.length === 0) {
      return res.status(404).json({ message: "No suspicious logs found" });
    }
    res.status(200).json(suspiciousLogs);
  } catch (error) {
    logger.error("Error fetching suspicious logs", {
      action: "FETCH_SUSPICIOUS_LOGS_ERROR",
      error: error.message,
    });
  }
});

router.get("/get-content-from-logs", async (req, res) => {
  try {
    const logs = await Log.find({
      action: { $regex: /CONTENT_?/, $options: "i" },
    })
      .select({
        userId: 1,
        timestamp: 1,
        "metadata.metadata.contentType": 1,
        "metadata.metadata.contentUrl": 1,
        "metadata.metadata.content": 1,
        "metadata.metadata.classification": 1,
        "metadata.metadata.moderationScore": 1,
        "metadata.metadata.reason": 1,
        "metadata.rawResult": 1,
        "metadata.suspicionLevel": 1,
        "metadata.suspicionReason": 1,
        "metadata.ipAddress": 1,
        "metadata.userAgent": 1,
        suspicionLevel: 1,
      })
      .sort({ timestamp: -1 });

    if (!logs || logs.length === 0) {
      return res.status(404).json({ message: "No content-related logs found" });
    }

    // Add a unified field for contentTextOrUrl
    const logsWithContent = logs.map((log) => ({
      ...log.toObject(),
      contentTextOrUrl:
        log.metadata?.content || log.metadata?.contentUrl || null,
    }));

    res.status(200).json(logsWithContent);
  } catch (error) {
    logger.error("Error fetching content from logs", {
      action: "FETCH_CONTENT_LOGS_ERROR",
      error: error.message,
    });
    res
      .status(500)
      .json({ message: "Error fetching content logs", error: error.message });
  }
});

router.get("/get-content-by-userId-from-logs", async (req, res) => {
  try {
    const { userId } = req.query;
    const logs = await Log.find({
      userId,
      action: { $regex: /CONTENT_?/, $options: "i" },
    }).sort({ timestamp: -1 });

    if (!logs || logs.length === 0) {
      return res
        .status(404)
        .json({ message: "No content-related logs found for this user" });
    }

    res.status(200).json(logs);
  } catch (error) {
    logger.error("Error fetching content logs by userId", {
      action: "FETCH_CONTENT_LOGS_BY_USER_ID_ERROR",
      error: error.message,
    });
    res
      .status(500)
      .json({ message: "Error fetching content logs", error: error.message });
  }
});

router.get("/get-user-activity", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const logs = await Log.find({ userId }).sort({ timestamp: -1 });

    if (!logs || logs.length === 0) {
      return res
        .status(404)
        .json({ message: "No activity logs found for this user" });
    }

    res.status(200).json(logs);
  } catch (error) {
    logger.error("Error fetching user activity logs", {
      action: "FETCH_USER_ACTIVITY_ERROR",
      error: error.message,
      userId: req.query.userId,
    });
    res.status(500).json({
      message: "Error fetching user activity logs",
      error: error.message,
    });
  }
});

module.exports = router;
