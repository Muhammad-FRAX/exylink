import express from "express";
import dataConnectionController from "../controllers/dataConnectionController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/", dataConnectionController.getAll.bind(dataConnectionController));
router.post("/", dataConnectionController.create.bind(dataConnectionController));
router.put("/:id", dataConnectionController.update.bind(dataConnectionController));
router.delete("/:id", dataConnectionController.delete.bind(dataConnectionController));
router.post("/test", dataConnectionController.testConnection.bind(dataConnectionController));

export default router;
