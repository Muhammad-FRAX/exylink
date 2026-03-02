import sequelize from "../config/database.js";
import DataConnection from "./DataConnection.js";
import TableConnection from "./TableConnection.js";

// Define Associations
DataConnection.hasMany(TableConnection, {
  foreignKey: "connection_id",
  as: "tables",
});
TableConnection.belongsTo(DataConnection, {
  foreignKey: "connection_id",
  as: "connection",
});

const models = {
  DataConnection,
  TableConnection,
};

export { sequelize, DataConnection, TableConnection };
export default models;
