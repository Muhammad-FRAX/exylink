import express from "express";
import ingestController from "../controllers/ingestController.js";
import { authenticateApiKey } from "../middleware/apiKeyMiddleware.js";
import uploadMiddleware from "../services/uploadService.js";

const router = express.Router();

/**
 * POST /api/external/ingest
 *
 * Public automation endpoint. No browser session needed.
 *
 * Headers:
 *   X-API-Key: exy_<your_key>
 *
 * Body (multipart/form-data):
 *   file      — Excel (.xlsx/.xls) or CSV file
 *   preset_id — ID of the table config preset to use
 *
 * Response:
 *   { success, preset, targetTable, stats: { totalRows, inserted, updated, skipped } }
 */
router.post(
  "/",
  authenticateApiKey,
  uploadMiddleware.single("file"),
  ingestController.ingestFile.bind(ingestController)
);

export default router;
