import express from "express";
import userController from "../controllers/userController.js";
import { authenticate, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// All user management routes require authentication + admin role
router.use(authenticate, requireAdmin);

// GET /api/v1/users
router.get("/", userController.getAll.bind(userController));

// POST /api/v1/users
router.post("/", userController.create.bind(userController));

// PUT /api/v1/users/:id
router.put("/:id", userController.update.bind(userController));

// DELETE /api/v1/users/:id
router.delete("/:id", userController.delete.bind(userController));

// PUT /api/v1/users/:id/password  (admin only via this router)
router.put("/:id/password", userController.changePassword.bind(userController));

export default router;
