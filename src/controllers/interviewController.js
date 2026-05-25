const asyncHandler = require("../utils/asyncHandler");
const interviewService = require("../services/interviewService");

const generateQuestions = asyncHandler(async (req, res) => {
  const questions = await interviewService.generateInterviewQuestions({
    resumeData: req.body.resumeData,
    skills: req.body.skills,
    projects: req.body.projects,
    questionCount: req.body.questionCount,
  });

  res.status(200).json({
    success: true,
    message: "Interview questions generated successfully",
    data: questions,
  });
});

module.exports = {
  generateQuestions,
};
