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
    type: String,
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed, 
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

const Log = mongoose.model("Log", logSchema);

module.exports = Log;
