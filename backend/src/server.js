// -------------------------------------------------------------------------------------------------
// ---------------------- [Imports] ----------------------------------------------------------------
import express from "express";
import helmet from "helmet";
import "dotenv/config";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";
import bcrypt from "bcryptjs";
import fileRoutes from "./routes/fileRoutes.js";
import dataConnectionRoutes from "./routes/dataConnectionRoutes.js";
import tableConnectionRoutes from "./routes/tableConnectionRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import apiKeyRoutes from "./routes/apiKeyRoutes.js";
import ingestRoutes from "./routes/ingestRoutes.js";
import { sequelize, User } from "./models/index.js";

// -------------------------------------------------------------------------------------------------
// ---------------------- [Configuration] ----------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 5000;

// -------------------------------------------------------------------------------------------------
// ---------------------- [Security Middleware] ----------------------------------------------------
app.use(cors());
app.use(helmet());

// Global Rate Limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error:
      "Too many requests from this source, please try again after 15 minutes",
  },
});

// Auth Rate Limiter
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error:
      "Too many login attempts from this source, please try again after 1 minute",
  },
});

// Apply Limiters
app.use(globalLimiter);
app.use("/api/auth", authLimiter);

// -------------------------------------------------------------------------------------------------
// ---------------------- [Core Middleware] --------------------------------------------------------

// Request Logging
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------------------------------------------------------------------------------------------------
// ---------------------- [Routes] -----------------------------------------------------------------

app.use("/api/auth", authRoutes);
app.use("/api/v1/files", fileRoutes);
app.use("/api/v1/connections", dataConnectionRoutes);
app.use("/api/v1/table-mappings", tableConnectionRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/api-keys", apiKeyRoutes);
app.use("/api/external/ingest", ingestRoutes);

app.get("/api", (_req, res) => {
  res.send("Exylink API");
});

// Serving frontend files (Production only)
if (process.env.NODE_ENV && process.env.NODE_ENV === "production") {
  const FrontendEntryPointPath = path.join(__dirname, "..", "dist");
  app.use(express.static(FrontendEntryPointPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(FrontendEntryPointPath, "index.html"));
  });
}

// -------------------------------------------------------------------------------------------------
// ---------------------- [Error Handling] ---------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("Error:", err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// -------------------------------------------------------------------------------------------------
// ---------------------- [Startup] ----------------------------------------------------------------

/**
 * Seeds the default admin user if one does not already exist.
 */
async function seedAdminUser() {
  const existing = await User.findOne({ where: { username: "admin" } });
  if (existing) return;

  const hashed = await bcrypt.hash("Welcome@123", 12);
  await User.create({
    username: "admin",
    email: "admin@exylink.com",
    password: hashed,
    role: "admin",
    is_active: true,
  });
  console.log("Default admin user created. Username: admin | Password: Welcome@123");
}

const initApp = async () => {
  try {
    // Sync all models — alter: true adds new columns without dropping existing data
    await sequelize.sync({ force: false });
    console.log("Main database synced successfully.");

    await seedAdminUser();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start application:", error.message);
    process.exit(1);
  }
};

initApp();
