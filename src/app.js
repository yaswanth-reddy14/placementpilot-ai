const express = require("express");
const cors = require("cors");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const resumeRoutes = require("./routes/resumeRoutes");
const jobRoutes = require("./routes/jobRoutes");
const interviewRoutes = require("./routes/interviewRoutes");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(
  express.json({
    limit: process.env.JSON_BODY_LIMIT || "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.JSON_BODY_LIMIT || "1mb",
  })
);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    name: "PlacementPilot AI API",
    version: "1.0.0",
    status: "running",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "PlacementPilot API is healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/v1", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the PlacementPilot API",
    endpoints: {
      resumes: "/api/v1/resumes",
      jobs: "/api/v1/jobs",
      interviews: "/api/v1/interviews",
      docs: "/api-docs",
    },
  });
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

app.use("/api/v1/resumes", resumeRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/interviews", interviewRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;