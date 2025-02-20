const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin");
const auth = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");
const fs = require("fs/promises");
const path = require("path");
const logger = require("../config/logger");
const aiLogAnalyzer = require("../services/aiLogAnalyzer");

// Get all users
router.get("/users", auth, adminMiddleware, adminController.getAllUser);

// Get all content for a specific user
router.get(
  "/user-content",
  auth,
  adminMiddleware,
  adminController.getAllContentofUser
);

// Get harmful content
router.get(
  "/harmful-content",
  auth,
  adminMiddleware,
  adminController.getHarmfullContent
);

// Remove content
router.delete("/content", auth, adminMiddleware, adminController.removeContent);

// Ban user
router.post("/ban-user", auth, adminMiddleware, adminController.banUser);

// get Logs
router.get("/logs", auth, adminMiddleware, adminController.getLogs);

// Get list of available analysis reports
router.get("/analysis-reports", auth, adminMiddleware, async (req, res) => {
  try {
    const reportsDir = path.join(process.cwd(), "reports", "ai-analysis");
    const files = await fs.readdir(reportsDir);

    const reports = files.map((file) => ({
      filename: file,
      date: file.split("-")[1].split(".")[0],
      type: file.split(".")[1],
    }));

    res.json({ reports });
  } catch (error) {
    res.status(500).json({ error: "Error fetching reports" });
  }
});

// Get specific report
router.get(
  "/analysis-reports/:filename",
  auth,
  adminMiddleware,
  async (req, res) => {
    try {
      const reportPath = path.join(
        process.cwd(),
        "reports",
        "ai-analysis",
        req.params.filename
      );

      const fileContent = await fs.readFile(reportPath);

      if (req.params.filename.endsWith(".html")) {
        res.setHeader("Content-Type", "text/html");
      } else {
        res.setHeader("Content-Type", "application/json");
      }

      res.send(fileContent);
    } catch (error) {
      res.status(404).json({ error: "Report not found" });
    }
  }
);

// Trigger AI log analysis manually
router.post("/trigger-analysis", auth, adminMiddleware, async (req, res) => {
  try {
    logger.info("Manual analysis triggered by admin", {
      action: "MANUAL_ANALYSIS_TRIGGER",
      adminId: req.user._id,
      timestamp: new Date(),
    });

    // Run analysis asynchronously
    aiLogAnalyzer.analyzeWeeklyLogs();

    res.status(200).json({
      message: "Analysis started successfully. Check reports in a few minutes.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error triggering analysis",
      error: error.message,
    });
  }
});

module.exports = router;
