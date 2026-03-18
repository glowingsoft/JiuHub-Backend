const mongoose = require("mongoose");
const { LocationSchema } = require("./locationSchema");

const academySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    location: {
      type: LocationSchema,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const Academy = mongoose.model("Academy", academySchema);

module.exports = Academy;
