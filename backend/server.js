const path = require("path");
const dotenv = require("dotenv");

// Explicitly load .env from the backend root directory
dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = require("./src/app");
const connectDB = require("./src/config/db");
const { disconnectDB } = require("./src/config/db");

const PORT = process.env.PORT || 5000;
let server;

async function startServer() {
  try {
    // Connect to the database first
    await connectDB();

    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT} [${process.env.NODE_ENV || "development"}]`);
    });
  } catch (error) {
    console.error("❌ Fatal error during server startup:", error.message);
    process.exit(1);
  }
}

// Graceful shutdown handling
async function handleShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      console.log("HTTP server closed.");
      await disconnectDB();
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

startServer();