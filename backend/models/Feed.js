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

const feedSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "feed_user_required"],
      index: true,
    },
    content: {
      type: String,
      trim: true,
      default: "",
      maxlength: 3000,
    },
    images: {
      type: [feedMediaSchema],
      default: [],
      validate: {
        validator: function (value) {
          return Array.isArray(value) && value.length <= 20;
        },
        message: "limit_exceeding_max_files",
      },
    },
    likes: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    shares: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    reposts: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    savedBy: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

feedSchema.index({ isDeleted: 1, createdAt: -1 });
feedSchema.index({ user: 1, createdAt: -1 });

const Feed = mongoose.model("Feed", feedSchema);

module.exports = {
  Feed,
};
