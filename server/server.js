const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

// Route imports
const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/customerRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const billingRoutes = require("./routes/billingRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health endpoint (public)
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "TiffinTrack API is running"
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/billing", billingRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

// Centralized error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`TiffinTrack server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

// Export app for testing
module.exports = app;
