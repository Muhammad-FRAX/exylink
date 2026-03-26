import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../models/index.js";

const JWT_SECRET = process.env.JWT_SECRET || "exylink_jwt_secret_dev";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Controller for authentication endpoints.
 */
class AuthController {
  /**
   * Log in with username and password. Returns a signed JWT on success.
   */
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res
          .status(400)
          .json({ error: "Username and password are required" });
      }

      const user = await User.findOne({ where: { username, is_active: true } });

      // Consistent error message to prevent account enumeration
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Login error:", error.message);
      res.status(500).json({ error: "Login failed" });
    }
  }

  /**
   * Return the current authenticated user's profile.
   */
  async me(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: ["id", "username", "email", "role", "created_at"],
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Profile fetch error:", error.message);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  }
}

export default new AuthController();
