const express = require("express");
const auth = require("../middlewares/authMiddleware");

const {
  getGroupsDashboard,
  getMyGroups,
  getFollowedGroups,
  getNewGroups,
  getGroups,
  getGroupById,
  getMembersByGroupId,
  createGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  toggleFollowGroup,
} = require("../controllers/groupController");

const router = express.Router();

router.use(auth);

router.get("/dashboard", getGroupsDashboard);
router.get("/my", getMyGroups);
router.get("/followed", getFollowedGroups);
router.get("/new", getNewGroups);
router.get("/", getGroups);
router.get("/:groupId", getGroupById);
router.get("/members/:groupId", getMembersByGroupId);
router.post("/", createGroup);
router.post("/join/:groupId", joinGroup);
router.post("/leave/:groupId", leaveGroup);
router.delete("/:groupId", deleteGroup);
router.post("/follow/:groupId", toggleFollowGroup);


module.exports = router;
