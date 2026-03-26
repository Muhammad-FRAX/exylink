import express from "express";
import fileController from "../controllers/fileController.js";
import uploadMiddleware from "../services/uploadService.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Route: POST /api/v1/files
 * Purpose: Upload and process Excel/CSV files into a database.
 * Middleware: Authentication, then Multer disk storage for temporary hold.
 */
router.post(
  "/",
  authenticate,
  uploadMiddleware.single("excelFile"),
  fileController.createFileImport.bind(fileController)
);

export default router;
