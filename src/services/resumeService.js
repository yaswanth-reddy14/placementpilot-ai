const fs = require("fs/promises");
const { PDFParse } = require("pdf-parse");

const extractTextFromPdf = async (file) => {
  if (!file) {
    const error = new Error("PDF resume file is required");
    error.statusCode = 400;
    throw error;
  }

  let parser;

  try {
    const buffer = await fs.readFile(file.path);
    parser = new PDFParse({ data: buffer });

    const result = await parser.getText();
    const extractedText = (result.text || "").trim();

    if (!extractedText) {
      const error = new Error("No readable text was found in the uploaded PDF");
      error.statusCode = 422;
      throw error;
    }

    return {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      pageCount: result.total || null,
      text: extractedText,
    };
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 422;
      error.message = `Unable to parse PDF resume: ${error.message}`;
    }

    throw error;
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }

    if (file.path) {
      await fs.unlink(file.path).catch(() => {});
    }
  }
};

module.exports = {
  extractTextFromPdf,
};
