import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const TableConnection = sequelize.define(
  "table_connections",
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
    connection_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "data_connections",
        key: "id",
      },
    },
    target_table_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sheet_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cell_range: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    has_headers: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "table_connections",
    underscored: true,
  }
);

export default TableConnection;
