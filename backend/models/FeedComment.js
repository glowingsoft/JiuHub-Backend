const mongoose = require("mongoose");

const feedCommentSchema = new mongoose.Schema(
  {
    feed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Feed",
      required: [true, "feed_required"],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "comment_user_required"],
      index: true,
    },
    comment: {
      type: String,
      required: [true, "comment_required"],
      trim: true,
      maxlength: 1000,
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

feedCommentSchema.index({ feed: 1, isDeleted: 1, createdAt: -1 });

const FeedComment = mongoose.model("FeedComment", feedCommentSchema);

module.exports = {
  FeedComment,
};
