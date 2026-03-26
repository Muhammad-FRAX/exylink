import express from "express";
import tableConnectionController from "../controllers/tableConnectionController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/", tableConnectionController.getAll.bind(tableConnectionController));
router.post("/", tableConnectionController.create.bind(tableConnectionController));
router.delete("/:id", tableConnectionController.delete.bind(tableConnectionController));

export default router;
