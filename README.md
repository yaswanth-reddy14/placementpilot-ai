# PlacementPilot AI

## Overview

PlacementPilot AI is an Express.js backend for AI-assisted placement workflows. It supports PDF resume upload, resume text extraction, structured AI resume analysis, job matching, and interview question generation using Gemini.

The project follows a clean route-controller-service architecture with centralized error handling, MongoDB connectivity, environment-based configuration, and Swagger/OpenAPI documentation.

## Features

- Upload PDF resumes with `multer`
- Temporarily store uploaded files and clean them up after parsing
- Extract raw text from resumes with `pdf-parse`
- Extract structured resume data with Gemini
- Match structured resume data against job descriptions
- Calculate match percentage
- Identify matching and missing skills
- Generate technical, HR, and project-based interview questions
- Include difficulty levels and short model answers
- Use deterministic fallback interview generation if Gemini fails
- Expose Swagger UI and raw OpenAPI JSON

## Tech Stack

- Node.js
- Express.js
- MongoDB and Mongoose
- Gemini API with `@google/generative-ai`
- Multer
- pdf-parse
- dotenv
- cors
- swagger-ui-express
- swagger-jsdoc
- nodemon

## Architecture

```text
Client
  |
  v
Express App (src/app.js)
  |
  +-- /api/v1/resumes
  |   +-- resumeRoutes
  |   +-- resumeController
  |   +-- resumeService
  |   +-- uploadMiddleware
  |
  +-- /api/v1/jobs
  |   +-- jobRoutes
  |   +-- jobController
  |   +-- jobMatchService
  |
  +-- /api/v1/interviews
  |   +-- interviewRoutes
  |   +-- interviewController
  |   +-- interviewService
  |
  +-- /api-docs
  |   +-- Swagger UI
  |
  v
MongoDB / Gemini API
```

## AI Workflow

1. A user uploads a PDF resume.
2. The resume upload API stores the file temporarily.
3. `pdf-parse` extracts raw resume text.
4. Gemini can convert raw resume text into structured data:
   - skills
   - education
   - projects
   - certifications
5. The job matching service compares structured resume data with a job description.
6. Gemini extracts job skills and the backend calculates match quality.
7. The interview generator creates technical, HR, and project-based questions from resume skills and projects.

## Fallback Reliability Strategy

PlacementPilot AI is designed so core flows fail predictably and safely:

- Resume PDF extraction works without Gemini.
- Temporary upload files are deleted in cleanup logic.
- Gemini responses are parsed defensively and normalized into clean JSON.
- Job matching returns controlled service errors if AI job analysis fails.
- Interview generation falls back to deterministic questions if Gemini is unavailable.
- All async route errors flow through centralized Express error middleware.
- Production responses hide stack traces.

## API Documentation

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | API metadata |
| `GET` | `/health` | Health check |
| `GET` | `/api/v1` | API index |
| `POST` | `/api/v1/resumes/upload` | Upload PDF resume and extract text |
| `POST` | `/api/v1/jobs/match` | Match resume data with a job description |
| `POST` | `/api/v1/interviews/generate` | Generate interview questions |
| `GET` | `/api-docs` | Swagger UI |
| `GET` | `/api-docs.json` | Raw OpenAPI specification |

## Setup Instructions

Install dependencies:

```bash
npm install
```

Create an environment file:

```bash
cp .env.example .env
```

Update `.env` with your MongoDB connection string and Gemini API key.

Run in development:

```bash
npm run dev
```

Run in production mode:

```bash
npm start
```

Check syntax:

```bash
npm run check
```

## Environment Variables

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/placementpilot
CORS_ORIGIN=http://localhost:3000
JSON_BODY_LIMIT=1mb
RESUME_UPLOAD_MAX_BYTES=5242880
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime environment |
| `PORT` | Server port |
| `MONGODB_URI` | MongoDB connection URI |
| `CORS_ORIGIN` | Allowed frontend origin or comma-separated origins |
| `JSON_BODY_LIMIT` | Maximum JSON request body size |
| `RESUME_UPLOAD_MAX_BYTES` | Maximum resume PDF upload size |
| `GEMINI_API_KEY` | Gemini API key |
| `GEMINI_MODEL` | Gemini model name |

## API Examples

### Resume Upload

```bash
curl -X POST http://localhost:5000/api/v1/resumes/upload \
  -F "resume=@resume.pdf"
```

Example response:

```json
{
  "success": true,
  "message": "Resume text extracted successfully",
  "data": {
    "originalName": "resume.pdf",
    "mimeType": "application/pdf",
    "size": 245321,
    "pageCount": 2,
    "text": "Candidate Name\nSkills: Node.js, Express, MongoDB..."
  }
}
```

### Job Match

```bash
curl -X POST http://localhost:5000/api/v1/jobs/match \
  -H "Content-Type: application/json" \
  -d '{
    "resumeData": {
      "skills": ["Node.js", "Express", "MongoDB", "REST APIs"],
      "projects": [
        {
          "name": "PlacementPilot",
          "description": "AI-powered placement platform",
          "technologies": ["Express", "MongoDB", "Gemini API"]
        }
      ],
      "certifications": []
    },
    "jobDescription": "We need a Node.js backend developer with Express, MongoDB, REST APIs, JWT, Docker, and cloud deployment."
  }'
```

Example response:

```json
{
  "success": true,
  "message": "Job match calculated successfully",
  "data": {
    "matchPercentage": 82,
    "matchingSkills": ["Node.js", "Express", "MongoDB", "REST APIs"],
    "missingSkills": ["Docker", "Cloud Deployment"],
    "resumeSkills": ["Node.js", "Express", "MongoDB", "REST APIs", "Gemini API"],
    "jobSkills": {
      "requiredSkills": ["Node.js", "Express", "MongoDB", "REST APIs"],
      "preferredSkills": ["Docker", "Cloud Deployment"]
    },
    "summary": {
      "requiredMatched": 4,
      "requiredTotal": 4,
      "preferredMatched": 0,
      "preferredTotal": 2
    }
  }
}
```

### Interview Generator

```bash
curl -X POST http://localhost:5000/api/v1/interviews/generate \
  -H "Content-Type: application/json" \
  -d '{
    "resumeData": {
      "skills": ["Node.js", "Express", "MongoDB", "Gemini API"],
      "projects": [
        {
          "name": "PlacementPilot",
          "description": "AI placement platform with resume parsing and job matching",
          "technologies": ["Express", "MongoDB", "Gemini API"]
        }
      ]
    },
    "questionCount": 3
  }'
```

Example response:

```json
{
  "success": true,
  "message": "Interview questions generated successfully",
  "data": {
    "source": "gemini",
    "technicalQuestions": [
      {
        "question": "How would you structure an Express API for resume uploads?",
        "difficulty": "medium",
        "modelAnswer": "Use multipart upload, validate file type and size, parse asynchronously, clean temporary files, and return structured output."
      }
    ],
    "hrQuestions": [
      {
        "question": "Tell me about a challenging technical problem you solved.",
        "difficulty": "medium",
        "modelAnswer": "Use situation-task-action-result and explain your decisions, tradeoffs, and outcome."
      }
    ],
    "projectBasedQuestions": [
      {
        "question": "In PlacementPilot, why did you use Gemini API?",
        "difficulty": "medium",
        "modelAnswer": "Gemini helps transform unstructured resume and job text into structured insights for matching and preparation.",
        "projectName": "PlacementPilot"
      }
    ]
  }
}
```

## Swagger Docs

Start the server and open:

```text
http://localhost:5000/api-docs
```

Raw OpenAPI JSON:

```text
http://localhost:5000/api-docs.json
```

Swagger includes endpoint descriptions, request examples, response schemas, and multipart upload documentation.

## Screenshots

Suggested screenshots to add:

```text
docs/screenshots/swagger-ui.png
docs/screenshots/resume-upload.png
docs/screenshots/job-match.png
docs/screenshots/interview-generator.png
docs/screenshots/architecture-diagram.png
```

## Deployment

Recommended deployment steps:

1. Set `NODE_ENV=production`.
2. Configure `MONGODB_URI` with a managed MongoDB provider.
3. Store `GEMINI_API_KEY` in platform secrets.
4. Set `CORS_ORIGIN` to the production frontend URL.
5. Install production dependencies.
6. Start the server.

```bash
npm install --omit=dev
npm start
```

Production recommendations:

- Run behind HTTPS.
- Add API rate limiting before public launch.
- Use managed secrets for database and AI keys.
- Enforce upload limits at both proxy and app layers.
- Use centralized logging and monitoring.
- Rotate credentials periodically.
