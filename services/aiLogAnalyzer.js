const Log = require("../models/log");
const logger = require("../config/logger");
const OpenAI = require("openai");
const fs = require("fs/promises");
const path = require("path");

class AILogAnalyzer {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzeWeeklyLogs() {
    try {
      const analysisReport = {
        startTime: new Date(),
        endTime: null,
        totalUsersAnalyzed: 0,
        suspiciousActivities: [],
        summary: {
          highSuspicion: 0,
          mediumSuspicion: 0,
          lowSuspicion: 0,
          clean: 0,
        },
        detailedFindings: [],
      };

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Fetch logs in batches
      const batchSize = 100;
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const logs = await Log.find({
          timestamp: { $gte: oneWeekAgo },
        })
          .skip((page - 1) * batchSize)
          .limit(batchSize)
          .populate("userId", "email name")
          .lean();

        if (logs.length === 0) {
          hasMore = false;
          continue;
        }

        const userLogs = this.groupLogsByUser(logs);

        // Analyze each user's activity pattern
        for (const [userId, userActivities] of Object.entries(userLogs)) {
          const userAnalysis = await this.analyzeUserActivity(
            userId,
            userActivities
          );
          this.updateAnalysisReport(analysisReport, userAnalysis);
        }

        page++;
      }

      analysisReport.endTime = new Date();
      await this.generateReport(analysisReport);

      logger.info("AI Log analysis completed", {
        action: "AI_LOG_ANALYSIS_COMPLETE",
        timestamp: new Date(),
        reportSummary: analysisReport.summary,
      });

      // Return the paths of the generated reports
      const reportDate = new Date().toISOString().split("T")[0];
      const reportDir = path.join(process.cwd(), "reports", "ai-analysis");
      return {
        jsonReport: path.join(reportDir, `analysis-${reportDate}.json`),
        htmlReport: path.join(reportDir, `analysis-${reportDate}.html`),
      };
    } catch (error) {
      logger.error("AI Log analysis error", {
        action: "AI_LOG_ANALYSIS_ERROR",
        error: error.message,
        stack: error.stack,
        timestamp: new Date(),
      });
      throw error; // Re-throw the error to be handled by the caller
    }
  }

  groupLogsByUser(logs) {
    return logs.reduce((acc, log) => {
      if (!log.userId) return acc;
      if (!acc[log.userId]) acc[log.userId] = [];
      acc[log.userId].push(log);
      return acc;
    }, {});
  }

  async analyzeUserActivity(userId, activities) {
    try {
      const activitySummary = this.prepareActivitySummary(activities);
      const analysis = await this.getAIAnalysis(activitySummary);

      if (analysis.suspicious) {
        await this.markLogsAsSuspicious(
          activities,
          analysis.suspicionLevel,
          analysis.reason
        );
      }

      return {
        userId,
        userEmail: activities[0]?.userId?.email,
        userName: activities[0]?.userId?.name,
        activitySummary,
        analysis,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error("Error analyzing user activity", {
        action: "USER_ACTIVITY_ANALYSIS_ERROR",
        userId,
        error: error.message,
      });
      return null;
    }
  }

  updateAnalysisReport(report, userAnalysis) {
    if (!userAnalysis) return;

    report.totalUsersAnalyzed++;

    if (userAnalysis.analysis.suspicious) {
      report.suspiciousActivities.push({
        userId: userAnalysis.userId,
        userEmail: userAnalysis.userEmail,
        userName: userAnalysis.userName,
        suspicionLevel: userAnalysis.analysis.suspicionLevel,
        reason: userAnalysis.analysis.reason,
        activitySummary: userAnalysis.activitySummary,
      });

      report.summary[`${userAnalysis.analysis.suspicionLevel}Suspicion`]++;
    } else {
      report.summary.clean++;
    }

    report.detailedFindings.push(userAnalysis);
  }

  async generateReport(analysisReport) {
    const reportDate = new Date().toISOString().split("T")[0];
    const reportDir = path.join(process.cwd(), "reports", "ai-analysis");

    // Ensure reports directory exists
    await fs.mkdir(reportDir, { recursive: true });

    // Generate JSON report
    const jsonReport = path.join(reportDir, `analysis-${reportDate}.json`);
    await fs.writeFile(jsonReport, JSON.stringify(analysisReport, null, 2));

    // Generate HTML report
    const htmlReport = path.join(reportDir, `analysis-${reportDate}.html`);
    const htmlContent = this.generateHtmlReport(analysisReport);
    await fs.writeFile(htmlReport, htmlContent);

    logger.info("Analysis reports generated", {
      action: "ANALYSIS_REPORT_GENERATED",
      reportFiles: [jsonReport, htmlReport],
      timestamp: new Date(),
    });
  }

  generateHtmlReport(report) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AI Log Analysis Report - ${new Date(
            report.startTime
          ).toLocaleDateString()}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { background: #f5f5f5; padding: 20px; margin-bottom: 20px; }
            .summary { margin-bottom: 20px; }
            .suspicious-activities { margin-bottom: 20px; }
            .activity { border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; }
            .high { background-color: #ffe6e6; }
            .medium { background-color: #fff3e6; }
            .low { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>AI Log Analysis Report</h1>
            <p>Analysis Period: ${new Date(
              report.startTime
            ).toLocaleString()} - ${new Date(
      report.endTime
    ).toLocaleString()}</p>
            <p>Total Users Analyzed: ${report.totalUsersAnalyzed}</p>
          </div>

          <div class="summary">
            <h2>Summary</h2>
            <ul>
              <li>High Suspicion Cases: ${report.summary.highSuspicion}</li>
              <li>Medium Suspicion Cases: ${report.summary.mediumSuspicion}</li>
              <li>Low Suspicion Cases: ${report.summary.lowSuspicion}</li>
              <li>Clean Cases: ${report.summary.clean}</li>
            </ul>
          </div>

          <div class="suspicious-activities">
            <h2>Suspicious Activities</h2>
            ${report.suspiciousActivities
              .map(
                (activity) => `
              <div class="activity ${activity.suspicionLevel}">
                <h3>User: ${activity.userName} (${activity.userEmail})</h3>
                <p>Suspicion Level: ${activity.suspicionLevel}</p>
                <p>Reason: ${activity.reason}</p>
                <details>
                  <summary>Activity Summary</summary>
                  <pre>${JSON.stringify(
                    activity.activitySummary,
                    null,
                    2
                  )}</pre>
                </details>
              </div>
            `
              )
              .join("")}
          </div>
        </body>
      </html>
    `;
  }

  prepareActivitySummary(activities) {
    // Group activities by type
    const summary = {
      loginAttempts: 0,
      failedLogins: 0,
      contentCreated: 0,
      harmfulContent: 0,
      warningContent: 0,
      errors: 0,
      timeRanges: new Set(),
      uniqueIPs: new Set(),
      actions: {},
    };

    activities.forEach((activity) => {
      // Count actions
      summary.actions[activity.action] =
        (summary.actions[activity.action] || 0) + 1;

      // Track unique IPs
      if (activity.ipAddress) summary.uniqueIPs.add(activity.ipAddress);

      // Track time ranges (hour of day)
      const hour = new Date(activity.timestamp).getHours();
      summary.timeRanges.add(hour);

      // Count specific activities
      switch (activity.action) {
        case "LOGIN_ATTEMPT":
          summary.loginAttempts++;
          break;
        case "LOGIN_ERROR":
          summary.failedLogins++;
          break;
        case "CREATE_CONTENT":
          summary.contentCreated++;
          if (activity.metadata?.classification === "Harmful") {
            summary.harmfulContent++;
          } else if (activity.metadata?.classification === "Warning") {
            summary.warningContent++;
          }
          break;
      }

      if (activity.level === "error") {
        summary.errors++;
      }
    });

    return {
      ...summary,
      timeRanges: Array.from(summary.timeRanges),
      uniqueIPs: Array.from(summary.uniqueIPs),
      totalActivities: activities.length,
      timespan: {
        start: new Date(activities[0].timestamp),
        end: new Date(activities[activities.length - 1].timestamp),
      },
    };
  }

  async getAIAnalysis(activitySummary) {
    const prompt = {
      role: "system",
      content: `Analyze the following user activity pattern for suspicious behavior. Consider:
        - Login attempts and failures
        - Content creation patterns
        - Error frequencies
        - Time patterns
        - IP address variations
        Activity Summary: ${JSON.stringify(activitySummary, null, 2)}`,
    };

    const userMessage = {
      role: "user",
      content:
        "Is this activity pattern suspicious? If yes, what is the suspicion level (low/medium/high) and reason?",
    };

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [prompt, userMessage],
      temperature: 0.3,
    });

    // Parse AI response
    const aiResponse = response.choices[0].message.content;
    return this.parseAIResponse(aiResponse);
  }

  parseAIResponse(aiResponse) {
    // Simple parsing logic - can be made more sophisticated
    const suspicious = aiResponse.toLowerCase().includes("suspicious");
    let suspicionLevel = "none";
    let reason = "";

    if (suspicious) {
      if (aiResponse.toLowerCase().includes("high")) suspicionLevel = "high";
      else if (aiResponse.toLowerCase().includes("medium"))
        suspicionLevel = "medium";
      else suspicionLevel = "low";

      // Extract reason (this is a simple implementation)
      const reasonMatch = aiResponse.match(/reason:?\s*([^\.]+)/i);
      reason = reasonMatch
        ? reasonMatch[1].trim()
        : "Suspicious pattern detected by AI";
    }

    return { suspicious, suspicionLevel, reason };
  }

  async markLogsAsSuspicious(activities, suspicionLevel, reason) {
    const logIds = activities.map((activity) => activity._id);
    await Log.updateMany(
      { _id: { $in: logIds } },
      {
        $set: {
          suspicionLevel,
          suspicionReason: `AI Analysis: ${reason}`,
        },
      }
    );
  }
}

module.exports = new AILogAnalyzer();
