const winston = require("winston");
const path = require("path");
const mongoose = require("mongoose");
const Log = require("../models/log");

class MongoTransport extends winston.Transport {
  constructor(opts) {
    super(opts);
    this.name = "MongoTransport";
  }

  async log(info, callback) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    try {
      const logEntry = new Log({
        level: info.level,
        message: info.message,
        action: info.action,
        userId: String(info.userId),
        metadata: {
          ...info,
          level: undefined,
          message: undefined,
          action: undefined,
          userId: undefined,
          timestamp: undefined,
        },
        timestamp: info.timestamp || new Date(),
      });

      await logEntry.save();
      callback();
    } catch (error) {
      console.error("Error saving log to MongoDB:", error);
      callback(error);
    }
  }
}

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

const logger = winston.createLogger({
  format: logFormat,
  transports: [
    // Console logging
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join("logs", "error.log"),
      level: "error",
    }),
    // Activity log file
    new winston.transports.File({
      filename: path.join("logs", "activity.log"),
    }),
    // MongoDB transport
    new MongoTransport(),
  ],
});

module.exports = logger;
