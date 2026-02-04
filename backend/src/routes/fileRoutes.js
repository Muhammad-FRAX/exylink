import express from "express";
import { uploadFile } from "../controllers/fileController.js";

const router = express.Router();

// Test Route
router.get("/", (req, res) => {
  res.send("Get Test Route");
});

// Upload File Route
router.post("/", uploadFile);

export default router;
