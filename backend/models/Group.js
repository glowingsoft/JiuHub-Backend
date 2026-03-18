const mongoose = require("mongoose");

const feedMediaSchema = new mongoose.Schema(
  {
    file: {
      type: String,
      required: [true, "feed_media_file_required"],
      trim: true,
    },
    fileExtension: {
      type: String,
      required: [true, "feed_media_extension_required"],
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: [
        "owner",
        "teacher",
        "instructor",
        "staff",
        "member",
        "follower",
        "visitor",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "pending", "banned"],
      default: "pending",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    groupImage: String,
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [memberSchema],
    profileImage: String,
    description: String,
    verification: {
      status: {
        type: String,
        enum: ["verified", "unverified", "pending"],
        default: "pending",
      },
      request: String, // field for verification request
    },
    groupImage: {
      type: feedMediaSchema,
      default: {},
    },
    coverImage: {
      type: feedMediaSchema,
      default: {},
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const Group = mongoose.model("Group", groupSchema);

module.exports = {
  Group,
};
