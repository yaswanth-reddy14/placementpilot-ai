const { GoogleGenerativeAI } = require("@google/generative-ai");

const DEFAULT_MODEL = "gemini-1.5-flash";

const buildResumeExtractionPrompt = (resumeText) => `
You are a resume information extraction engine.

Extract structured data from the resume text and return ONLY valid JSON.
Do not include markdown fences, comments, explanations, or extra text.

Required JSON schema:
{
  "skills": ["string"],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "fieldOfStudy": "string",
      "startDate": "string",
      "endDate": "string",
      "grade": "string"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["string"],
      "links": ["string"]
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "date": "string",
      "credentialUrl": "string"
    }
  ]
}

Rules:
- Use empty arrays when a section is not found.
- Use empty strings for unknown object fields.
- Remove duplicates.
- Keep skills concise, for example "Node.js" instead of long phrases.
- Preserve project and certification names as written where possible.

Resume text:
${resumeText}
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

const extractJsonObject = (content) => {
  const trimmed = content.trim();

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

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
};

const normalizeObjectArray = (value, shape) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => {
      const normalized = {};

      for (const [key, defaultValue] of Object.entries(shape)) {
        if (Array.isArray(defaultValue)) {
          normalized[key] = normalizeStringArray(item[key]);
        } else {
          normalized[key] = String(item[key] || "").trim();
        }
      }

      return normalized;
    });
};

const normalizeResumeData = (data) => ({
  skills: normalizeStringArray(data.skills),
  education: normalizeObjectArray(data.education, {
    degree: "",
    institution: "",
    fieldOfStudy: "",
    startDate: "",
    endDate: "",
    grade: "",
  }),
  projects: normalizeObjectArray(data.projects, {
    name: "",
    description: "",
    technologies: [],
    links: [],
  }),
  certifications: normalizeObjectArray(data.certifications, {
    name: "",
    issuer: "",
    date: "",
    credentialUrl: "",
  }),
});

const extractStructuredResumeData = async (resumeText) => {
  if (!resumeText || typeof resumeText !== "string" || !resumeText.trim()) {
    const error = new Error("Resume text is required for AI extraction");
    error.statusCode = 400;
    throw error;
  }

  try {
    const model = getGeminiModel();
    const prompt = buildResumeExtractionPrompt(resumeText.trim());
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsedData = extractJsonObject(responseText);

    return normalizeResumeData(parsedData);
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    const serviceError = new Error(`Gemini resume extraction failed: ${error.message}`);
    serviceError.statusCode = 502;
    throw serviceError;
  }
};

module.exports = {
  extractStructuredResumeData,
};
