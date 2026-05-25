const asyncHandler = require("../utils/asyncHandler");
const jobMatchService = require("../services/jobMatchService");

const matchJob = asyncHandler(async (req, res) => {
  const matchResult = await jobMatchService.matchResumeToJob({
    resumeData: req.body.resumeData,
    jobDescription: req.body.jobDescription,
  });

  res.status(200).json({
    success: true,
    message: "Job match calculated successfully",
    data: matchResult,
  });
});

module.exports = {
  matchJob,
};
