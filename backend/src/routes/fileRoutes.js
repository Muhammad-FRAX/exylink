import express from "express";
import fileController from "../controllers/fileController.js";
import uploadMiddleware from "../services/uploadService.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/v1/files — upload + stage (parse + duplicate detection)
router.post(
  "/",
  authenticate,
  uploadMiddleware.single("excelFile"),
  fileController.stageFileImport.bind(fileController)
);

// POST /api/v1/files/:jobId/confirm — user confirmed, start background insertion
router.post(
  "/:jobId/confirm",
  authenticate,
  fileController.confirmFileImport.bind(fileController)
);

// DELETE /api/v1/files/:jobId — user cancelled, discard the staged job
router.delete(
  "/:jobId",
  authenticate,
  fileController.cancelFileImport.bind(fileController)
);

export default router;
