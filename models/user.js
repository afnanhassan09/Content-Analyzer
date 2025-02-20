const mongoose = require("mongoose");

const UserSchema = mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    banDuration: {
      type: Number,
      default: 4,
    },
    bannedAt: {
      type: Date,
      default: null,
    },
    banReason: {
      type: String,
      default: null,
    },
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

UserSchema.pre(["find", "findOne"], async function () {
  const now = new Date();

  await mongoose.model("User").updateMany(
    {
      isBanned: true,
      bannedAt: {
        $lt: new Date(now - 1000 * 60 * 60 * 24), // More than 24 hours ago
      },
      banDuration: { $exists: true, $ne: null },
    },
    {
      $set: {
        isBanned: false,
        banDuration: null,
        bannedAt: null,
        banReason: null,
      },
    }
  );
});

// Method to check if user is currently banned
UserSchema.methods.isCurrentlyBanned = function () {
  if (!this.isBanned || !this.bannedAt || !this.banDuration) {
    return false;
  }

  const now = new Date();
  const banExpirationTime = new Date(
    this.bannedAt.getTime() + this.banDuration * 60 * 60 * 1000
  );

  return now < banExpirationTime;
};

// Method to get remaining ban time in hours
UserSchema.methods.getRemainingBanTime = function () {
  if (!this.isCurrentlyBanned()) {
    return 0;
  }

  const now = new Date();
  const banExpirationTime = new Date(
    this.bannedAt.getTime() + this.banDuration * 60 * 60 * 1000
  );
  const remainingMs = banExpirationTime - now;

  return Math.ceil(remainingMs / (1000 * 60 * 60)); // Convert ms to hours and round up
};

const User = mongoose.model("User", UserSchema);

module.exports = User;
