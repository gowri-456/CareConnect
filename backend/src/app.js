const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const apiRoutes = require("./routes/index");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : true }));
app.use(express.json({ limit: "10mb" })); // supports a small set of base64 image attachments
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev")); // logs each request to the console
}

// Health check
app.get("/", (req, res) => {
  res.json({ success: true, message: "Operations Platform API is running." });
});

// All API routes live under /api/v1
app.use("/api/v1", apiRoutes);

// 404 + error handling (must be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
