const express = require("express");

const interviewController = require("../controllers/interviewController");

const router = express.Router();

router.post("/generate", interviewController.generateQuestions);

module.exports = router;
