const aiLogAnalyzer = require("../services/aiLogAnalyzer");
const logger = require("../config/logger");

async function runAnalysisNow() {
  logger.info("Starting manual AI log analysis", {
    action: "MANUAL_AI_LOG_ANALYSIS_START",
    timestamp: new Date(),
  });

  try {
    await aiLogAnalyzer.analyzeWeeklyLogs();
    console.log(
      "Analysis completed successfully! Check the reports directory for results."
    );
  } catch (error) {
    console.error("Analysis failed:", error);
  }
}

// Run the analysis
runAnalysisNow();
