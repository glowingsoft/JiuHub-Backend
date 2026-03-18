const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes.js");
const userRoutes = require("./userRoutes.js");
const uploadRoutes = require("./uploadRoutes.js");
const uploads3Routes = require("./uploadAWSRoutes.js");
const bulkInsertRoutes = require("./dbRoutes.js");
const adminSettingsRoutes = require("./adminSettingsRoutes.js");
const communicationRoutes = require("./communicationRoutes.js");
const notificationsRoutes = require("./notificationsRoutes.js");
const supportRoutes = require("./supportRoutes.js");
const contactUsRoutes = require("./contactUsRoutes.js");
const languagesRoutes = require("./languageRoutes.js");
const homeRoutes = require("./homeRoutes.js");
const adminsRoutes = require("./adminRoutes.js");
const locationRoutes = require("./locationRoutes.js");
const academyRoutes = require("./academyRoutes.js");
const feedRoutes = require("./feedRoutes.js");
const groupRoutes = require("./groupRoutes.js");

router.use("/auth", authRoutes);

router.use("/users", userRoutes);
router.use("/upload", uploadRoutes);
router.use("/upload/s3", uploads3Routes);
router.use("/settings", adminSettingsRoutes);
router.use("/communications", communicationRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/support", supportRoutes);
router.use("/contact-us", contactUsRoutes);
router.use("/locations", locationRoutes);
router.use("/academies", academyRoutes);
router.use("/languages", languagesRoutes);
router.use("/home", homeRoutes);
router.use("/feeds", feedRoutes);
router.use("/groups", groupRoutes);
router.use("/admin", adminsRoutes);
//db utils routes
router.use("/util", bulkInsertRoutes);

module.exports = router;
