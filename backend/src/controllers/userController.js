import bcrypt from "bcryptjs";
import { User } from "../models/index.js";

const SALT_ROUNDS = 12;

/**
 * Controller for user management (admin operations).
 */
class UserController {
  /**
   * Get all users. Admin only.
   */
  async getAll(req, res) {
    try {
      const users = await User.findAll({
        attributes: ["id", "username", "email", "role", "is_active", "created_at"],
        order: [["created_at", "DESC"]],
      });
      res.json(users);
    } catch (error) {
      console.error("Failed to fetch users:", error.message);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  }

  /**
   * Create a new user. Admin only.
   */
  async create(req, res) {
    try {
      const { username, email, password, role } = req.body;

      if (!username || !email || !password) {
        return res
          .status(400)
          .json({ error: "Username, email and password are required" });
      }

      const hashed = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await User.create({
        username,
        email,
        password: hashed,
        role: role || "visitor",
      });

      res.status(201).json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
      });
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        return res
          .status(409)
          .json({ error: "Username or email already exists" });
      }
      console.error("Failed to create user:", error.message);
      res.status(500).json({ error: "Failed to create user" });
    }
  }

  /**
   * Update a user's details (username, email, role, is_active). Admin only.
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const { username, email, role, is_active } = req.body;

      const [updated] = await User.update(
        { username, email, role, is_active },
        { where: { id } }
      );

      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await User.findByPk(id, {
        attributes: ["id", "username", "email", "role", "is_active", "created_at"],
      });

      res.json(updatedUser);
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        return res
          .status(409)
          .json({ error: "Username or email already exists" });
      }
      console.error("Failed to update user:", error.message);
      res.status(500).json({ error: "Failed to update user" });
    }
  }

  /**
   * Delete a user. Admin only. Cannot delete own account.
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      if (id === req.user.id) {
        return res
          .status(400)
          .json({ error: "Cannot delete your own account" });
      }

      const deleted = await User.destroy({ where: { id } });

      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Failed to delete user:", error.message);
      res.status(500).json({ error: "Failed to delete user" });
    }
  }

  /**
   * Change a user's password.
   * Admins can reset any user's password without providing the current one.
   * Visitors can change only their own password and must provide the current one.
   */
  async changePassword(req, res) {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;
      const isAdmin = req.user.role === "admin";
      const isSelf = id === req.user.id;

      if (!isAdmin && !isSelf) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (!newPassword || newPassword.length < 8) {
        return res
          .status(400)
          .json({ error: "New password must be at least 8 characters" });
      }

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Non-admin users must provide their current password
      if (!isAdmin) {
        if (!currentPassword) {
          return res
            .status(400)
            .json({ error: "Current password is required" });
        }
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) {
          return res
            .status(401)
            .json({ error: "Current password is incorrect" });
        }
      }

      const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await user.update({ password: hashed });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Failed to change password:", error.message);
      res.status(500).json({ error: "Failed to change password" });
    }
  }
}

export default new UserController();
