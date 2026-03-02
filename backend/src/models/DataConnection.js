import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const DataConnection = sequelize.define(
  "data_connections",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dialect: {
      type: DataTypes.ENUM("postgres", "mysql", "sqlite", "mssql"),
      allowNull: false,
    },
    host: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    port: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING, // Should be encrypted in production
      allowNull: true,
    },
    database_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    storage_path: {
      type: DataTypes.STRING, // For SQLite only
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "data_connections",
    underscored: true,
  }
);

export default DataConnection;
