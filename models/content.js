const mongoose = require("mongoose");

const contentSchema = new mongoose.Schema(
  {
    userID: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      enum: ["post", "comment", "file"],
      required: true,
    },
    classification: {
      type: String,
      enum: ["Safe", "Warning", "Harmful"],
    },
    moderationScore: {
      type: Number,
      default: 0,
    },
    reason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const Content = mongoose.model("Content", contentSchema);

module.exports = Content;
