const mongoose = require("mongoose");
require("dotenv").config({ path: `.env.${process.env.NODE_ENV || "dev"}` });

const startServer = (app, uri) => {
  app.listen(process.env.PORT, () => {
    console.log("Running on", process.env.PORT, ">", uri);
  });
};

const connectToDB = async (app) => {
  try {
    const uri = process.env.BASE_URL;
    await mongoose.connect(uri);
    startServer(app, uri);
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
  }
};

module.exports = connectToDB;
