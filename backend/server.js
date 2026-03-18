require("dotenv").config({ path: `.env.${process.env.NODE_ENV || "dev"}` });
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const express = require("express");
const connectToDB = require("./helperUtils/server-setup");

const { sendResponse } = require("./helperUtils/responseUtil");
const { i18nConfig } = require("./config/i18nConfig");
const { backupMongoDB } = require("./helperUtils/dataBaseBackup");
const { securityMiddleware } = require("./middlewares/security");
// const { loggerMiddleware } = require("./middlewares/logger");

// const logsDir = path.join(__dirname, "logs");
// if (!fs.existsSync(logsDir)) {
//   fs.mkdirSync(logsDir);
// }

// Express app
const app = express();

app.set("trust proxy", 1); // trust first proxy to get correct IP in req.ip

// ================== Security Middleware ================== //
const allowedOrigins = [
  "https://domain.com", //domain production
  "http://localhost:4001", //domain local
  "http://192.168.12.121:4001", //domain local network
];
securityMiddleware(app, {
  allowedOrigins,
  adminIPWhitelist: [], // Example whitelist
  maxRequestSize: "10mb",
  rateLimitWindow: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 200, // max requests per window
});

// i18n middleware initialization for language localization

app.use(i18nConfig.init);
// app.use(loggerMiddleware);
if (process.env.NODE_ENV != "prod") {
}
app.use(morgan("dev"));
app.use(express.json());

connectToDB(app);

//TODO update according to service used e.g s3/blob storage
// Start MongoDB backup timer (24 hours)
// const backupTime = 24 * 60 * 60 * 1000;
// setInterval(() => backupMongoDB(), backupTime);

// Routes
app.get("/", (req, res) => {
  res.send("Hello from Node.js!");
});
app.get("/favicon.ico", (req, res) => res.status(204).end());
app.get("/favicon.png", (req, res) => res.status(204).end());

app.use("/api", require("./routes/index"));

// Global error handler
app.use((req, res, next) => {
  sendResponse({
    res,
    statusCode: 404,
    translationKey: "route_not_found",
  });
});

module.exports = app;
