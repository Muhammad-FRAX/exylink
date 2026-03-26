import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "exylink_jwt_secret_dev";

/**
 * Verifies the Bearer token and attaches the decoded payload to req.user.
 */
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

/**
 * Restricts access to admin-role users only.
 * Must be used after `authenticate`.
 */
export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};
