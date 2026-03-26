import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const ApiKey = sequelize.define(
  "api_keys",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // SHA-256 hash of the raw key — never store plaintext
    key_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    // First 16 chars of the raw key for display (e.g. "exy_a1b2c3d4e5f6")
    key_prefix: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true, // null = never expires
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  },
  {
    tableName: "api_keys",
    underscored: true,
  }
);

export default ApiKey;
