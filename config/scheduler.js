const cron = require("node-cron");
const aiLogAnalyzer = require("../services/aiLogAnalyzer");
const logger = require("./logger");

// Run AI analysis daily at midnight
cron.schedule("0 0 * * *", async () => {
  logger.info("Starting AI log analysis", {
    action: "AI_LOG_ANALYSIS_START",
    timestamp: new Date(),
  });

  await aiLogAnalyzer.analyzeWeeklyLogs();
});

module.exports = cron;
