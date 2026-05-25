const { extractTextFromPdf } = require("../services/resumeService");

const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No resume uploaded",
      });
    }

    const extractedData = await extractTextFromPdf(req.file);

    res.status(200).json({
      success: true,
      data: extractedData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadResume,
};