const express = require("express");
const router = express.Router();
const aiLogAnalyzer = require("../services/aiLogAnalyzer");
const fs = require("fs/promises");
const logger = require("../config/logger");


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

module.exports = router;
