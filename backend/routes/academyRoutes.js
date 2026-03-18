const express = require("express");

const {
  getAllAcademies,
  getAcademies,
  getAcademyById,
  createAcademy,
  updateAcademy,
  deleteAcademy,
  searchAcademies,
} = require("../controllers/academyController");

const router = express.Router();

router.get("/all", getAllAcademies);
router.get("/", getAcademies);
router.get("/:id", getAcademyById);
router.post("/", createAcademy);
router.put("/:id", updateAcademy);
router.delete("/:id", deleteAcademy);
router.get("/search", searchAcademies);

module.exports = router;
