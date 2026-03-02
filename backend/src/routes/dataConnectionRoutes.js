import express from "express";
import dataConnectionController from "../controllers/dataConnectionController.js";

const router = express.Router();

// Get all connections
router.get("/", dataConnectionController.getAll.bind(dataConnectionController));

// Create connection
router.post(
  "/",
  dataConnectionController.create.bind(dataConnectionController)
);

// Update connection
router.put(
  "/:id",
  dataConnectionController.update.bind(dataConnectionController)
);

// Delete connection
router.delete(
  "/:id",
  dataConnectionController.delete.bind(dataConnectionController)
);

// Test connection without saving
router.post(
  "/test",
  dataConnectionController.testConnection.bind(dataConnectionController)
);

export default router;
