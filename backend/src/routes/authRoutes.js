import express from "express";
import authController from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/auth/login
router.post("/login", authController.login.bind(authController));

// GET /api/auth/me
router.get("/me", authenticate, authController.me.bind(authController));

export default router;
