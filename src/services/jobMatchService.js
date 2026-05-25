const { GoogleGenerativeAI } = require("@google/generative-ai");

const DEFAULT_MODEL = "gemini-2.0-flash";

const normalizeSkill = (skill) =>
  String(skill || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const titleCaseSkill = (skill) =>
  String(skill || "")
    .trim()
    .replace(/\s+/g, " ");

const uniqueCleanSkills = (skills) => {
  const seen = new Map();

  for (const skill of Array.isArray(skills) ? skills : []) {
    const clean = titleCaseSkill(skill);
    const key = normalizeSkill(clean);

    if (key && !seen.has(key)) {
      seen.set(key, clean);
    }
  }

  return [...seen.values()];
};

const collectResumeSkills = (resumeData) => {
  const directSkills = Array.isArray(resumeData?.skills)
    ? resumeData.skills
    : [];

  const projectTechnologies = Array.isArray(resumeData?.projects)
    ? resumeData.projects.flatMap(
        (project) => project?.technologies || []
      )
    : [];

  const certificationNames = Array.isArray(
    resumeData?.certifications
  )
    ? resumeData.certifications.map(
        (certification) => certification?.name
      )
    : [];

  return uniqueCleanSkills([
    ...directSkills,
    ...projectTechnologies,
    ...certificationNames,
  ]);
};

const buildJobSkillPrompt = (jobDescription) => `
You are a job description analysis engine.

Extract the required and preferred technical/professional skills from this job description.

Return ONLY valid JSON.

Required JSON schema:
{
  "requiredSkills": ["string"],
  "preferredSkills": ["string"]
}

Job description:
${jobDescription}
`;

const getGeminiModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY is not configured");
    error.statusCode = 500;
    throw error;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });
};

const parseJsonObject = (content) => {
  const trimmed = String(content || "").trim();

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw error;
    }

    return JSON.parse(trimmed.slice(start, end + 1));
  }
};

const extractJobSkills = async (jobDescription) => {
  const model = getGeminiModel();

  const result = await model.generateContent(
    buildJobSkillPrompt(jobDescription)
  );

  const parsed = parseJsonObject(result.response.text());

  return {
    requiredSkills: uniqueCleanSkills(
      parsed.requiredSkills || []
    ),
    preferredSkills: uniqueCleanSkills(
      parsed.preferredSkills || []
    ),
  };
};

const hasSkillMatch = (candidateSkill, jobSkill) => {
  const candidate = normalizeSkill(candidateSkill);
  const job = normalizeSkill(jobSkill);

  return (
    candidate === job ||
    candidate.includes(job) ||
    job.includes(candidate)
  );
};

const compareSkills = (resumeSkills, jobSkills) => {
  const matchingSkills = [];
  const missingSkills = [];

  for (const jobSkill of jobSkills) {
    const matchedSkill = resumeSkills.find((resumeSkill) =>
      hasSkillMatch(resumeSkill, jobSkill)
    );

    if (matchedSkill) {
      matchingSkills.push(jobSkill);
    } else {
      missingSkills.push(jobSkill);
    }
  }

  return {
    matchingSkills: uniqueCleanSkills(matchingSkills),
    missingSkills: uniqueCleanSkills(missingSkills),
  };
};

const calculateMatchPercentage = ({
  requiredMatches,
  requiredTotal,
  preferredMatches,
  preferredTotal,
}) => {
  if (requiredTotal === 0 && preferredTotal === 0) {
    return 0;
  }

  const requiredScore =
    requiredTotal > 0
      ? requiredMatches / requiredTotal
      : 1;

  const preferredScore =
    preferredTotal > 0
      ? preferredMatches / preferredTotal
      : 0;

  const weightedScore =
    requiredScore * 0.8 + preferredScore * 0.2;

  return Math.round(weightedScore * 100);
};

const matchResumeToJob = async ({
  resumeData,
  jobDescription,
}) => {
  if (
    !resumeData ||
    typeof resumeData !== "object" ||
    Array.isArray(resumeData)
  ) {
    const error = new Error(
      "Structured resume data is required"
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    !jobDescription ||
    typeof jobDescription !== "string" ||
    !jobDescription.trim()
  ) {
    const error = new Error(
      "Job description is required"
    );
    error.statusCode = 400;
    throw error;
  }

  const resumeSkills = collectResumeSkills(resumeData);

  if (resumeSkills.length === 0) {
    const error = new Error(
      "Resume data must include at least one skill"
    );
    error.statusCode = 400;
    throw error;
  }

  let jobSkills = {
    requiredSkills: [],
    preferredSkills: [],
  };

  try {
    jobSkills = await extractJobSkills(
      jobDescription.trim()
    );

    const requiredComparison = compareSkills(
      resumeSkills,
      jobSkills.requiredSkills
    );

    const preferredComparison = compareSkills(
      resumeSkills,
      jobSkills.preferredSkills
    );

    const allJobSkills = uniqueCleanSkills([
      ...jobSkills.requiredSkills,
      ...jobSkills.preferredSkills,
    ]);

    const allComparison = compareSkills(
      resumeSkills,
      allJobSkills
    );

    const matchPercentage = calculateMatchPercentage({
      requiredMatches:
        requiredComparison.matchingSkills.length,
      requiredTotal:
        jobSkills.requiredSkills.length,
      preferredMatches:
        preferredComparison.matchingSkills.length,
      preferredTotal:
        jobSkills.preferredSkills.length,
    });

    return {
      matchPercentage,
      matchingSkills:
        allComparison.matchingSkills,
      missingSkills:
        allComparison.missingSkills,
      resumeSkills,
      jobSkills,
      summary: {
        mode: "ai",
        requiredMatched:
          requiredComparison.matchingSkills.length,
        requiredTotal:
          jobSkills.requiredSkills.length,
        preferredMatched:
          preferredComparison.matchingSkills.length,
        preferredTotal:
          jobSkills.preferredSkills.length,
      },
    };
  } catch (error) {
    console.error(
      "Gemini AI failed. Using fallback matching."
    );

    const fallbackSkills = [
      "Node.js",
      "Express",
      "MongoDB",
      "REST APIs",
      "JWT",
      "Docker",
      "Redis",
      "JavaScript",
    ];

    const detectedJobSkills = fallbackSkills.filter(
      (skill) =>
        jobDescription
          .toLowerCase()
          .includes(skill.toLowerCase())
    );

    const fallbackComparison = compareSkills(
      resumeSkills,
      detectedJobSkills
    );

    const fallbackPercentage =
      detectedJobSkills.length > 0
        ? Math.round(
            (fallbackComparison.matchingSkills.length /
              detectedJobSkills.length) *
              100
          )
        : 0;

    return {
      matchPercentage: fallbackPercentage,
      matchingSkills:
        fallbackComparison.matchingSkills,
      missingSkills:
        fallbackComparison.missingSkills,
      resumeSkills,
      jobSkills: {
        requiredSkills: detectedJobSkills,
        preferredSkills: [],
      },
      summary: {
        mode: "fallback",
        aiAvailable: false,
        reason:
          "Gemini quota exceeded or unavailable",
      },
    };
  }
};

module.exports = {
  matchResumeToJob,
};