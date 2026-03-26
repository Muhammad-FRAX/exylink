import { createHash } from "crypto";
import ApiKey from "../models/ApiKey.js";
import { User } from "../models/index.js";

/**
 * Authenticates a request using an API key passed in the X-API-Key header.
 * On success, attaches req.user and req.apiKeyRecord.
 */
export const authenticateApiKey = async (req, res, next) => {
  try {
    const rawKey = req.headers["x-api-key"];

    if (!rawKey || !rawKey.startsWith("exy_")) {
      return res.status(401).json({
        error: "API key required.",
        hint: "Pass your key in the X-API-Key header. Keys start with 'exy_'.",
      });
    }

    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    const keyRecord = await ApiKey.findOne({
      where: { key_hash: keyHash, is_active: true },
    });

    if (!keyRecord) {
      return res.status(401).json({ error: "Invalid or revoked API key." });
    }

    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return res.status(401).json({ error: "API key has expired." });
    }

    // Non-blocking last-used timestamp update
    keyRecord.update({ last_used_at: new Date() }).catch(() => {});

    const user = await User.findByPk(keyRecord.user_id);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: "Account is inactive." });
    }

    req.user = { id: user.id, username: user.username, role: user.role };
    req.apiKeyRecord = keyRecord;
    next();
  } catch (err) {
    console.error(`API key authentication error: ${err.message}`);
    return res.status(500).json({ error: "Authentication service unavailable." });
  }
};
