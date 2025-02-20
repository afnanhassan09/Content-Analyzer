const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
  level: {
    type: String,
    required: true,
    enum: ["error", "warn", "info", "debug"],
  },
  message: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed, // For additional data like errors, content info, etc.
  },
  suspicionLevel: {
    type: String,
    enum: ["none", "low", "medium", "high"],
    default: "none",
  },
  suspicionReason: {
    type: String,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Log", logSchema);
