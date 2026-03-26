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
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
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
      type: DataTypes.STRING,
      allowNull: true,
    },
    database_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    storage_path: {
      type: DataTypes.STRING,
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
