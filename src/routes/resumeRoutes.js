const express = require("express");

const { uploadResume } = require("../controllers/resumeController");
const { uploadResumePdf } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/upload", uploadResumePdf.single("resume"), uploadResume);

module.exports = router;
