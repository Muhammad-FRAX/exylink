import { randomBytes, createHash } from "crypto";
import ApiKey from "../models/ApiKey.js";

const DURATION_DAYS = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
  never: null,
};

function generateKey() {
  // "exy_" + 64 hex chars = 68 char key
  return `exy_${randomBytes(32).toString("hex")}`;
}

function hashKey(key) {
  return createHash("sha256").update(key).digest("hex");
}

function computeExpiry(duration) {
  const days = DURATION_DAYS[duration];
  if (days == null) return null;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

class ApiKeyController {
  async list(req, res) {
    try {
      const keys = await ApiKey.findAll({
        where: { user_id: req.user.id },
        attributes: { exclude: ["key_hash"] },
        order: [["created_at", "DESC"]],
      });
      res.json(keys);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async create(req, res) {
    try {
      const { name, duration = "never" } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ error: "Name is required." });
      }
      if (!Object.keys(DURATION_DAYS).includes(duration)) {
        return res.status(400).json({ error: "Invalid duration." });
      }

      const rawKey = generateKey();
      const keyHash = hashKey(rawKey);
      const keyPrefix = rawKey.slice(0, 16); // "exy_" + 12 hex chars

      const apiKey = await ApiKey.create({
        user_id: req.user.id,
        name: name.trim(),
        key_hash: keyHash,
        key_prefix: keyPrefix,
        expires_at: computeExpiry(duration),
      });

      // Return the full key exactly once — it is never stored in plaintext
      res.status(201).json({
        id: apiKey.id,
        name: apiKey.name,
        key_prefix: apiKey.key_prefix,
        expires_at: apiKey.expires_at,
        is_active: apiKey.is_active,
        last_used_at: apiKey.last_used_at,
        created_at: apiKey.created_at,
        fullKey: rawKey,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async revoke(req, res) {
    try {
      const key = await ApiKey.findOne({
        where: { id: req.params.id, user_id: req.user.id },
      });
      if (!key) return res.status(404).json({ error: "API key not found." });

      await key.update({ is_active: false });
      res.json({ message: "API key revoked." });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async destroy(req, res) {
    try {
      const key = await ApiKey.findOne({
        where: { id: req.params.id, user_id: req.user.id },
      });
      if (!key) return res.status(404).json({ error: "API key not found." });

      await key.destroy();
      res.json({ message: "API key deleted." });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

export default new ApiKeyController();
