import express from "express";
import fileController from "../controllers/fileController.js";
import uploadMiddleware from "../services/uploadService.js";

const router = express.Router();

/**
 * Route: POST /api/v1/files
 * Purpose: Upload and process Excel/CSV files into a database.
 * Middleware: Multer disk storage for temporary hold.
 */
router.post(
  "/",
  uploadMiddleware.single("excelFile"),
  fileController.createFileImport.bind(fileController)
);

export default router;
