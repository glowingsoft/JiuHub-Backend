const express = require("express");
const auth = require("../middlewares/authMiddleware");
const {
  createFeed,
  getFeeds,
  getFeedById,
  updateFeed,
  deleteFeed,
  toggleLikeFeed,
  toggleSaveFeed,
  shareFeed,
  repostFeed,
  addComment,
  deleteComment,
} = require("../controllers/feedController");

const router = express.Router();

router.use(auth);

router.post("/", createFeed);
router.get("/", getFeeds);
router.get("/:feedId", getFeedById);
router.put("/:feedId", updateFeed);
router.delete("/:feedId", deleteFeed);

router.post("/:feedId/like", toggleLikeFeed);
router.post("/:feedId/save", toggleSaveFeed);
router.post("/:feedId/share", shareFeed);
router.post("/:feedId/repost", repostFeed);

router.post("/:feedId/comments", addComment);
router.delete("/:feedId/comments/:commentId", deleteComment);

module.exports = router;
