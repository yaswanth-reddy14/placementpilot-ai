const express = require("express");

const jobController = require("../controllers/jobController");

const router = express.Router();

router.post("/match", jobController.matchJob);

module.exports = router;
