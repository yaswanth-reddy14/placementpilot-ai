const swaggerJsdoc = require("swagger-jsdoc");

const serverUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

const swaggerDefinition = {
  openapi: "3.0.3",
  info: {
    title: "PlacementPilot AI API",
    version: "1.0.0",
    description:
      "Backend APIs for AI-powered resume parsing, job matching, and interview question generation.",
    contact: {
      name: "PlacementPilot AI",
    },
  },
  servers: [
    {
      url: serverUrl,
      description: "Configured API server",
    },
  ],
  tags: [
    {
      name: "Health",
      description: "Service status and API discovery endpoints.",
    },
    {
      name: "Resumes",
      description: "Upload PDF resumes and extract raw text.",
    },
    {
      name: "Jobs",
      description: "Compare structured resume data against a job description.",
    },
    {
      name: "Interviews",
      description: "Generate interview questions from resume skills and projects.",
    },
  ],
  paths: {
    "/": {
      get: {
        tags: ["Health"],
        summary: "API root",
        description: "Returns basic API metadata and confirms the service is running.",
        responses: {
          200: {
            description: "API metadata.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiRootResponse",
                },
              },
            },
          },
        },
      },
    },
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        description: "Returns process uptime and a timestamp for operational checks.",
        responses: {
          200: {
            description: "API is healthy.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/HealthResponse",
                },
              },
            },
          },
        },
      },
    },
    "/api/v1": {
      get: {
        tags: ["Health"],
        summary: "API index",
        description: "Lists the main API route groups available under version 1.",
        responses: {
          200: {
            description: "API index response.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiIndexResponse",
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/resumes/upload": {
      post: {
        tags: ["Resumes"],
        summary: "Upload a PDF resume",
        description:
          "Uploads a PDF resume using multipart/form-data, stores it temporarily, extracts text with pdf-parse, deletes the temporary file, and returns the extracted text.",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["resume"],
                properties: {
                  resume: {
                    type: "string",
                    format: "binary",
                    description: "PDF resume file. Field name must be `resume`.",
                  },
                },
              },
              encoding: {
                resume: {
                  contentType: "application/pdf",
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Resume text extracted successfully.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ResumeUploadResponse",
                },
                example: {
                  success: true,
                  message: "Resume text extracted successfully",
                  data: {
                    originalName: "yaswanth_resume.pdf",
                    mimeType: "application/pdf",
                    size: 245321,
                    pageCount: 2,
                    text: "Yaswanth Reddy\\nBackend Developer\\nSkills: Node.js, Express, MongoDB...",
                  },
                },
              },
            },
          },
          400: {
            $ref: "#/components/responses/BadRequest",
          },
          422: {
            description: "PDF could not be parsed or contained no readable text.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          500: {
            $ref: "#/components/responses/InternalServerError",
          },
        },
      },
    },
    "/api/v1/jobs/match": {
      post: {
        tags: ["Jobs"],
        summary: "Match resume data to a job description",
        description:
          "Uses Gemini to extract required and preferred skills from a job description, compares them with structured resume skills/projects/certifications, and returns a weighted match score.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/JobMatchRequest",
              },
              examples: {
                backendRole: {
                  summary: "Backend developer match",
                  value: {
                    resumeData: {
                      skills: ["Node.js", "Express", "MongoDB", "REST APIs", "JWT"],
                      projects: [
                        {
                          name: "PlacementPilot",
                          description: "AI-powered placement platform",
                          technologies: ["Express", "MongoDB", "Gemini API"],
                        },
                      ],
                      certifications: [
                        {
                          name: "Node.js Backend Development",
                          issuer: "Coursera",
                          date: "2025",
                          credentialUrl: "",
                        },
                      ],
                    },
                    jobDescription:
                      "We need a Node.js backend developer experienced with Express, MongoDB, REST APIs, JWT authentication, Docker, and cloud deployment.",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Job match calculated successfully.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/JobMatchResponse",
                },
              },
            },
          },
          400: {
            $ref: "#/components/responses/BadRequest",
          },
          502: {
            description: "Gemini job analysis failed.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/interviews/generate": {
      post: {
        tags: ["Interviews"],
        summary: "Generate interview questions",
        description:
          "Generates technical, HR, and project-based interview questions from resume skills and projects. Falls back to deterministic questions if Gemini is unavailable.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/InterviewGenerateRequest",
              },
              examples: {
                fromResumeData: {
                  summary: "Generate from structured resume data",
                  value: {
                    resumeData: {
                      skills: ["Node.js", "Express", "MongoDB", "Gemini API"],
                      projects: [
                        {
                          name: "PlacementPilot",
                          description: "AI placement platform with resume parsing and job matching",
                          technologies: ["Express", "MongoDB", "Gemini API"],
                        },
                      ],
                    },
                    questionCount: 3,
                  },
                },
                directInputs: {
                  summary: "Generate from direct skills and projects",
                  value: {
                    skills: ["React", "Node.js", "REST APIs"],
                    projects: [
                      {
                        name: "Student Dashboard",
                        description: "Dashboard for placement analytics",
                        technologies: ["React", "Express"],
                      },
                    ],
                    questionCount: 5,
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Interview questions generated successfully.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/InterviewGenerateResponse",
                },
              },
            },
          },
          400: {
            $ref: "#/components/responses/BadRequest",
          },
          500: {
            $ref: "#/components/responses/InternalServerError",
          },
        },
      },
    },
  },
  components: {
    responses: {
      BadRequest: {
        description: "Invalid request payload.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
          },
        },
      },
      InternalServerError: {
        description: "Unexpected server error.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
          },
        },
      },
    },
    schemas: {
      ApiRootResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          name: { type: "string", example: "PlacementPilot AI API" },
          version: { type: "string", example: "1.0.0" },
          status: { type: "string", example: "running" },
        },
      },
      HealthResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "PlacementPilot API is healthy" },
          uptime: { type: "number", example: 128.42 },
          timestamp: {
            type: "string",
            format: "date-time",
            example: "2026-05-25T09:30:00.000Z",
          },
        },
      },
      ApiIndexResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Welcome to the PlacementPilot API" },
          endpoints: {
            type: "object",
            properties: {
              resumes: { type: "string", example: "/api/v1/resumes" },
              jobs: { type: "string", example: "/api/v1/jobs" },
              interviews: { type: "string", example: "/api/v1/interviews" },
            },
          },
        },
      },
      ResumeUploadResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Resume text extracted successfully" },
          data: {
            type: "object",
            properties: {
              originalName: { type: "string", example: "resume.pdf" },
              mimeType: { type: "string", example: "application/pdf" },
              size: { type: "integer", example: 245321 },
              pageCount: { type: "integer", nullable: true, example: 2 },
              text: {
                type: "string",
                example: "Candidate Name\\nSkills: Node.js, Express, MongoDB...",
              },
            },
          },
        },
      },
      ResumeData: {
        type: "object",
        properties: {
          skills: {
            type: "array",
            items: { type: "string" },
            example: ["Node.js", "Express", "MongoDB"],
          },
          education: {
            type: "array",
            items: { $ref: "#/components/schemas/Education" },
          },
          projects: {
            type: "array",
            items: { $ref: "#/components/schemas/Project" },
          },
          certifications: {
            type: "array",
            items: { $ref: "#/components/schemas/Certification" },
          },
        },
      },
      Education: {
        type: "object",
        properties: {
          degree: { type: "string", example: "B.Tech" },
          institution: { type: "string", example: "ABC Institute of Technology" },
          fieldOfStudy: { type: "string", example: "Computer Science" },
          startDate: { type: "string", example: "2022" },
          endDate: { type: "string", example: "2026" },
          grade: { type: "string", example: "8.4 CGPA" },
        },
      },
      Project: {
        type: "object",
        properties: {
          name: { type: "string", example: "PlacementPilot" },
          description: {
            type: "string",
            example: "AI-powered platform for resume parsing and job matching.",
          },
          technologies: {
            type: "array",
            items: { type: "string" },
            example: ["Node.js", "Express", "MongoDB"],
          },
          links: {
            type: "array",
            items: { type: "string" },
            example: ["https://github.com/example/placementpilot"],
          },
        },
      },
      Certification: {
        type: "object",
        properties: {
          name: { type: "string", example: "Backend Development with Node.js" },
          issuer: { type: "string", example: "Coursera" },
          date: { type: "string", example: "2025" },
          credentialUrl: {
            type: "string",
            example: "https://example.com/certificate",
          },
        },
      },
      JobMatchRequest: {
        type: "object",
        required: ["resumeData", "jobDescription"],
        properties: {
          resumeData: { $ref: "#/components/schemas/ResumeData" },
          jobDescription: {
            type: "string",
            minLength: 1,
            example:
              "Looking for a Node.js backend developer with Express, MongoDB, REST APIs, JWT, and Docker.",
          },
        },
      },
      JobMatchResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Job match calculated successfully" },
          data: {
            type: "object",
            properties: {
              matchPercentage: { type: "integer", minimum: 0, maximum: 100, example: 82 },
              matchingSkills: {
                type: "array",
                items: { type: "string" },
                example: ["Node.js", "Express", "MongoDB", "REST APIs"],
              },
              missingSkills: {
                type: "array",
                items: { type: "string" },
                example: ["Docker", "AWS"],
              },
              resumeSkills: {
                type: "array",
                items: { type: "string" },
              },
              jobSkills: {
                type: "object",
                properties: {
                  requiredSkills: {
                    type: "array",
                    items: { type: "string" },
                  },
                  preferredSkills: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
              summary: {
                type: "object",
                properties: {
                  requiredMatched: { type: "integer", example: 4 },
                  requiredTotal: { type: "integer", example: 5 },
                  preferredMatched: { type: "integer", example: 1 },
                  preferredTotal: { type: "integer", example: 2 },
                },
              },
            },
          },
        },
      },
      InterviewGenerateRequest: {
        type: "object",
        properties: {
          resumeData: { $ref: "#/components/schemas/ResumeData" },
          skills: {
            type: "array",
            items: { type: "string" },
            example: ["Node.js", "Express", "MongoDB"],
          },
          projects: {
            type: "array",
            items: { $ref: "#/components/schemas/Project" },
          },
          questionCount: {
            type: "integer",
            minimum: 1,
            maximum: 10,
            default: 5,
            example: 5,
          },
        },
        description:
          "Provide either resumeData or direct skills/projects. At least one skill or project is required.",
      },
      InterviewQuestion: {
        type: "object",
        properties: {
          question: {
            type: "string",
            example: "How would you design a REST API for resume uploads?",
          },
          difficulty: {
            type: "string",
            enum: ["easy", "medium", "hard"],
            example: "medium",
          },
          modelAnswer: {
            type: "string",
            example:
              "Use a multipart upload endpoint, validate file type and size, store temporarily, parse asynchronously, and return structured results.",
          },
        },
      },
      ProjectBasedQuestion: {
        allOf: [
          { $ref: "#/components/schemas/InterviewQuestion" },
          {
            type: "object",
            properties: {
              projectName: {
                type: "string",
                example: "PlacementPilot",
              },
            },
          },
        ],
      },
      InterviewGenerateResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: {
            type: "string",
            example: "Interview questions generated successfully",
          },
          data: {
            type: "object",
            properties: {
              source: {
                type: "string",
                enum: ["gemini", "fallback"],
                example: "gemini",
              },
              warning: {
                type: "string",
                nullable: true,
                example: "Gemini generation unavailable: GEMINI_API_KEY is not configured",
              },
              technicalQuestions: {
                type: "array",
                items: { $ref: "#/components/schemas/InterviewQuestion" },
              },
              hrQuestions: {
                type: "array",
                items: { $ref: "#/components/schemas/InterviewQuestion" },
              },
              projectBasedQuestions: {
                type: "array",
                items: { $ref: "#/components/schemas/ProjectBasedQuestion" },
              },
            },
          },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Invalid request payload" },
          stack: {
            type: "string",
            nullable: true,
            description: "Included only outside production.",
          },
        },
      },
    },
  },
};

const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: [],
});

module.exports = swaggerSpec;
