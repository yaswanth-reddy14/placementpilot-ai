const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const resumeUploadDir = path.join(process.cwd(), "uploads", "resumes");
const maxFileSize = Number(process.env.RESUME_UPLOAD_MAX_BYTES || 5 * 1024 * 1024);

const storage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdir(resumeUploadDir, { recursive: true }, (error) => {
      callback(error, resumeUploadDir);
    });
  },
  filename(req, file, callback) {
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.pdf`;
    callback(null, uniqueName);
  },
});

const pdfFileFilter = (req, file, callback) => {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const isPdf = file.mimetype === "application/pdf" && extension === ".pdf";

  if (!isPdf) {
    const error = new Error("Only PDF resume uploads are allowed");
    error.statusCode = 400;
    return callback(error);
  }

  return callback(null, true);
};

const uploadResumePdf = multer({
  storage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: maxFileSize,
    files: 1,
  },
});

module.exports = {
  uploadResumePdf,
};
