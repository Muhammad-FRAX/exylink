import express from "express";
import apiKeyController from "../controllers/apiKeyController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET  /api/v1/api-keys          — list user's keys
router.get("/", authenticate, apiKeyController.list.bind(apiKeyController));

// POST /api/v1/api-keys          — create a new key
router.post("/", authenticate, apiKeyController.create.bind(apiKeyController));

// PATCH /api/v1/api-keys/:id/revoke — deactivate without deleting
router.patch(
  "/:id/revoke",
  authenticate,
  apiKeyController.revoke.bind(apiKeyController)
);

// DELETE /api/v1/api-keys/:id   — permanently delete
router.delete(
  "/:id",
  authenticate,
  apiKeyController.destroy.bind(apiKeyController)
);

export default router;
