const { GoogleGenerativeAI } = require("@google/generative-ai");

const DEFAULT_MODEL = "gemini-1.5-flash";
const DEFAULT_QUESTION_COUNT = 5;

const cleanString = (value) => String(value || "").trim();

const uniqueStrings = (values) => {
  const seen = new Set();
  const cleaned = [];

  for (const value of Array.isArray(values) ? values : []) {
    const item = cleanString(value);
    const key = item.toLowerCase();

    if (item && !seen.has(key)) {
      seen.add(key);
      cleaned.push(item);
    }
  }

  return cleaned;
};

const normalizeProjects = (projects) => {
  if (!Array.isArray(projects)) {
    return [];
  }

  return projects
    .filter((project) => project && typeof project === "object" && !Array.isArray(project))
    .map((project) => ({
      name: cleanString(project.name) || "Project",
      description: cleanString(project.description),
      technologies: uniqueStrings(project.technologies),
    }))
    .filter((project) => project.name || project.description || project.technologies.length);
};

const getInputPayload = ({ resumeData, skills, projects }) => {
  const resumeSkills = Array.isArray(resumeData?.skills) ? resumeData.skills : [];
  const directSkills = Array.isArray(skills) ? skills : [];
  const projectSource = Array.isArray(projects) ? projects : resumeData?.projects;

  const normalizedProjects = normalizeProjects(projectSource);
  const projectTechnologies = normalizedProjects.flatMap((project) => project.technologies);
  const normalizedSkills = uniqueStrings([...resumeSkills, ...directSkills, ...projectTechnologies]);

  return {
    skills: normalizedSkills,
    projects: normalizedProjects,
  };
};

const getQuestionCount = (count) => {
  const parsed = Number(count);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_QUESTION_COUNT;
  }

  return Math.min(Math.max(Math.round(parsed), 1), 10);
};

const buildPrompt = ({ skills, projects, questionCount }) => `
You are an expert technical interviewer.

Generate interview questions from the candidate's resume skills and projects.
Return ONLY valid JSON. Do not include markdown fences, comments, or explanations.

Required JSON schema:
{
  "technicalQuestions": [
    {
      "question": "string",
      "difficulty": "easy | medium | hard",
      "modelAnswer": "string"
    }
  ],
  "hrQuestions": [
    {
      "question": "string",
      "difficulty": "easy | medium | hard",
      "modelAnswer": "string"
    }
  ],
  "projectBasedQuestions": [
    {
      "question": "string",
      "difficulty": "easy | medium | hard",
      "modelAnswer": "string",
      "projectName": "string"
    }
  ]
}

Rules:
- Generate ${questionCount} questions per category.
- Technical questions must focus on the listed skills.
- Project-based questions must reference the listed projects when available.
- HR questions should assess communication, ownership, teamwork, learning, and problem solving.
- Model answers must be short, practical, and suitable for interview preparation.
- If project details are limited, infer reasonable project questions from skills.

Candidate skills:
${JSON.stringify(skills)}

Candidate projects:
${JSON.stringify(projects)}
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
      temperature: 0.35,
      responseMimeType: "application/json",
    },
  });
};

const parseJsonObject = (content) => {
  const trimmed = cleanString(content);

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

const normalizeDifficulty = (difficulty, fallback = "medium") => {
  const value = cleanString(difficulty).toLowerCase();

  return ["easy", "medium", "hard"].includes(value) ? value : fallback;
};

const normalizeQuestions = (questions, includeProjectName = false) => {
  if (!Array.isArray(questions)) {
    return [];
  }

  return questions
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => {
      const question = {
        question: cleanString(item.question),
        difficulty: normalizeDifficulty(item.difficulty),
        modelAnswer: cleanString(item.modelAnswer),
      };

      if (includeProjectName) {
        question.projectName = cleanString(item.projectName);
      }

      return question;
    })
    .filter((item) => item.question && item.modelAnswer);
};

const normalizeAiResponse = (data) => ({
  technicalQuestions: normalizeQuestions(data?.technicalQuestions),
  hrQuestions: normalizeQuestions(data?.hrQuestions),
  projectBasedQuestions: normalizeQuestions(data?.projectBasedQuestions, true),
});

const cyclePick = (items, index, fallback) => {
  if (!items.length) {
    return fallback;
  }

  return items[index % items.length];
};

const createFallbackQuestions = ({ skills, projects, questionCount }) => {
  const fallbackSkills = skills.length ? skills : ["problem solving", "backend development", "API design"];
  const fallbackProjects = projects.length
    ? projects
    : [{ name: "Resume Project", description: "", technologies: fallbackSkills }];

  const difficulties = ["easy", "medium", "hard"];

  const technicalQuestions = Array.from({ length: questionCount }, (_, index) => {
    const skill = cyclePick(fallbackSkills, index, "backend development");

    return {
      question: `How would you explain your practical experience with ${skill}?`,
      difficulty: difficulties[index % difficulties.length],
      modelAnswer: `Describe where you used ${skill}, the problem it solved, and one tradeoff or limitation you considered.`,
    };
  });

  const hrTemplates = [
    {
      question: "Tell me about a challenging technical problem you solved.",
      difficulty: "medium",
      modelAnswer: "Use a situation-task-action-result structure and emphasize your ownership, decisions, and measurable outcome.",
    },
    {
      question: "How do you handle feedback during a project?",
      difficulty: "easy",
      modelAnswer: "Explain that you clarify the feedback, prioritize changes, communicate tradeoffs, and apply improvements quickly.",
    },
    {
      question: "Describe a time you had to learn a new tool or technology quickly.",
      difficulty: "medium",
      modelAnswer: "Mention the learning approach, how you validated your understanding, and how it helped the project.",
    },
    {
      question: "How do you manage deadlines when requirements change?",
      difficulty: "medium",
      modelAnswer: "Discuss re-scoping, communicating risks early, focusing on high-impact tasks, and keeping stakeholders updated.",
    },
    {
      question: "Why should we consider you for this role?",
      difficulty: "easy",
      modelAnswer: "Connect your skills, projects, learning mindset, and ability to deliver practical solutions to the role.",
    },
  ];

  const hrQuestions = Array.from({ length: questionCount }, (_, index) => hrTemplates[index % hrTemplates.length]);

  const projectBasedQuestions = Array.from({ length: questionCount }, (_, index) => {
    const project = cyclePick(fallbackProjects, index, fallbackProjects[0]);
    const technology = cyclePick(project.technologies || fallbackSkills, index, fallbackSkills[0]);

    return {
      question: `In ${project.name}, why did you use ${technology}, and what alternative would you consider?`,
      difficulty: difficulties[(index + 1) % difficulties.length],
      modelAnswer: `Explain the project context, why ${technology} fit the requirement, and compare it with one realistic alternative.`,
      projectName: project.name,
    };
  });

  return {
    technicalQuestions,
    hrQuestions,
    projectBasedQuestions,
  };
};

const hasEnoughAiQuestions = (questions, questionCount) =>
  questions.technicalQuestions.length >= 1 &&
  questions.hrQuestions.length >= 1 &&
  questions.projectBasedQuestions.length >= 1 &&
  questions.technicalQuestions.length <= questionCount + 2 &&
  questions.hrQuestions.length <= questionCount + 2 &&
  questions.projectBasedQuestions.length <= questionCount + 2;

const generateInterviewQuestions = async ({ resumeData, skills, projects, questionCount } = {}) => {
  const payload = getInputPayload({ resumeData, skills, projects });
  const count = getQuestionCount(questionCount);

  if (payload.skills.length === 0 && payload.projects.length === 0) {
    const error = new Error("At least one resume skill or project is required");
    error.statusCode = 400;
    throw error;
  }

  try {
    const model = getGeminiModel();
    const result = await model.generateContent(buildPrompt({ ...payload, questionCount: count }));
    const parsed = parseJsonObject(result.response.text());
    const questions = normalizeAiResponse(parsed);

    if (!hasEnoughAiQuestions(questions, count)) {
      throw new Error("Gemini returned incomplete interview questions");
    }

    return {
      source: "gemini",
      ...questions,
    };
  } catch (error) {
    const fallbackQuestions = createFallbackQuestions({ ...payload, questionCount: count });

    return {
      source: "fallback",
      warning: `Gemini generation unavailable: ${error.message}`,
      ...fallbackQuestions,
    };
  }
};

module.exports = {
  generateInterviewQuestions,
};
