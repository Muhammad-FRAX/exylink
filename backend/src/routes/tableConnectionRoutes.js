import express from "express";
import tableConnectionController from "../controllers/tableConnectionController.js";

const router = express.Router();

// Get all mappings
router.get(
  "/",
  tableConnectionController.getAll.bind(tableConnectionController)
);

// Create mapping
router.post(
  "/",
  tableConnectionController.create.bind(tableConnectionController)
);

// Delete mapping
router.delete(
  "/:id",
  tableConnectionController.delete.bind(tableConnectionController)
);

export default router;
