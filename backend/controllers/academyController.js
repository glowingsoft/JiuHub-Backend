const Academy = require("../models/Academy");

const {
  sendResponse,
  validateParams,
  parsePaginationParams,
  generateMeta,
} = require("../helperUtils/responseUtil");

// Make a crud to add academy, get academies, update academy and delete academy

const getAllAcademies = async (req, res, next) => {
  try {
    const { page, limit } = parsePaginationParams(req);

    const [academies, totalAcademies] = await Promise.all([
      Academy.find()
        .skip((page - 1) * limit)
        .limit(limit),
      Academy.countDocuments(),
    ]);

    const meta = generateMeta(page, limit, totalAcademies);

    return sendResponse({
      res,
      statusCode: 200,
      translationKey: "academies_fetched_successfully",
      data: academies,
      meta,
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      translationKey: "something_went_wrong",
      error,
    });
  }
};

const getAcademies = async (req, res, next) => {
  try {
    const { page, limit } = parsePaginationParams(req);

    const [academies, totalAcademies] = await Promise.all([
      Academy.find({ active: true })
        .skip((page - 1) * limit)
        .limit(limit),
      Academy.countDocuments({ active: true }),
    ]);

    const meta = generateMeta(page, limit, totalAcademies);

    return sendResponse({
      res,
      statusCode: 200,
      translationKey: "academies_fetched_successfully",
      data: academies,
      meta,
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      translationKey: "something_went_wrong",
      error,
    });
  }
};

const getAcademyById = async (req, res, next) => {
  try {
    const { academyId } = req.params;

    const academy = await Academy.findById(academyId);
    if (!academy) {
      return sendResponse({
        res,
        statusCode: 404,
        translationKey: "academy_not_found",
      });
    }

    return sendResponse({
      res,
      statusCode: 200,
      translationKey: "academy_fetched_successfully",
      data: academy,
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      translationKey: "something_went_wrong",
      error,
    });
  }
};

const createAcademy = async (req, res, next) => {
  try {
    const { name, location } = req.body;

    const validationOptions = {
      rawData: ["name", "location"],
    };

    if (!validateParams(req, res, validationOptions)) {
      return; // Validation failed, response already sent
    }

    const newAcademy = new Academy({ name, location });
    await newAcademy.save();

    return sendResponse({
      res,
      statusCode: 201,
      translationKey: "academy_created_successfully",
      data: newAcademy,
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      translationKey: "something_went_wrong",
      error,
    });
  }
};

const updateAcademy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, location } = req.body;

    const validationOptions = {
      rawData: ["name"],
      objectIdFields: ["id"],
    };

    if (!validateParams(req, res, validationOptions)) {
      return; // Validation failed, response already sent
    }

    const academy = await Academy.findById(id);
    if (!academy) {
      return sendResponse({
        res,
        statusCode: 404,
        translationKey: "academy_not_found",
      });
    }
_id: incomingAcademyId
    academy.name = name;
    if (location) {
      academy.location = location;
    }
    await academy.save();

    return sendResponse({
      res,
      statusCode: 200,
      translationKey: "academy_updated_successfully",
      data: academy,
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      translationKey: "something_went_wrong",
      error,
    });
  }
};

const deleteAcademy = async (req, res, next) => {
  try {
    const { id } = req.params;

    const validationOptions = {
      objectIdFields: ["id"],
    };

    if (!validateParams(req, res, validationOptions)) {
      return; // Validation failed, response already sent
    }

    const academy = await Academy.findById(id);
    if (!academy) {
      return sendResponse({
        res,
        statusCode: 404,
        translationKey: "academy_not_found",
      });
    }

    await academy.deleteOne();

    return sendResponse({
      res,
      statusCode: 200,
      translationKey: "academy_deleted_successfully",
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      translationKey: "something_went_wrong",
      error,
    });
  }
};

const searchAcademies = async (req, res, next) => {
  console.log("searchAcademies called");
  try {
    const { search } = req.query;
    console.log("search", search);

    const academies = await Academy.find({
      name: { $regex: search, $options: "i" },
      active: true,
    });

    return sendResponse({
      res,
      statusCode: 200,
      translationKey: "academies_fetched_successfully",
      data: academies,
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      translationKey: "something_went_wrong",
      error,
    });
  }
};

module.exports = {
  getAllAcademies,
  getAcademies,
  getAcademyById,
  createAcademy,
  updateAcademy,
  deleteAcademy,
  searchAcademies,
};
