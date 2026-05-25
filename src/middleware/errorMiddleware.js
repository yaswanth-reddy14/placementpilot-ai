const multer = require("multer");

const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message;
  const isProduction = process.env.NODE_ENV === "production";

  if (err instanceof multer.MulterError) {
    statusCode = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "Uploaded PDF exceeds the maximum allowed size" : err.message;
  }

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 && isProduction ? "Internal server error" : message,
    stack: isProduction ? undefined : err.stack,
  });
};

module.exports = {
  notFound,
  errorHandler,
};
