const mongoose = require("mongoose");

/**
 * Connect to MongoDB with robust connection management,
 * event listeners, and detailed error handling.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("❌ Database Configuration Error: MONGO_URI is not defined in environment variables.");
    console.error("👉 Please ensure backend/.env exists and contains a valid MONGO_URI.");
    throw new Error("MONGO_URI is not defined in environment variables.");
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    // Ensure indexes that allow service requests without jobs/bookings
    try {
      const db = conn.connection.db;
      const invoiceIndexes = await db.collection("invoices").indexes().catch(() => []);
      const nonSparseJob = invoiceIndexes.find((i) => i.name === "job_1" && !i.sparse);
      if (nonSparseJob) {
        await db.collection("invoices").dropIndex("job_1");
        await db.collection("invoices").createIndex({ job: 1 }, { unique: true, sparse: true });
      }

      const reviewIndexes = await db.collection("reviews").indexes().catch(() => []);
      const nonSparseRev = reviewIndexes.find((i) => i.name === "booking_1_reviewer_1" && !i.sparse);
      if (nonSparseRev) {
        await db.collection("reviews").dropIndex("booking_1_reviewer_1");
        await db.collection("reviews").createIndex({ booking: 1, reviewer: 1 }, { unique: true, sparse: true });
      }
    } catch (idxErr) {
      console.warn("⚠️ Note on index alignment:", idxErr.message);
    }

    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    throw error;
  }
}

/**
 * Disconnect from MongoDB (useful for graceful shutdown and testing)
 */
async function disconnectDB() {
  try {
    await mongoose.connection.close();
    console.log("ℹ️ MongoDB connection closed successfully.");
  } catch (error) {
    console.error(`❌ Error closing MongoDB connection: ${error.message}`);
  }
}

// Lifecycle event listeners
mongoose.connection.on("error", (err) => {
  console.error(`❌ MongoDB connection error: ${err.message}`);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB connection lost. Disconnected.");
});

mongoose.connection.on("reconnected", () => {
  console.log("🔄 MongoDB reconnected successfully.");
});

// Support both default function import and named destructuring
module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.disconnectDB = disconnectDB;