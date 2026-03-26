import sequelize from "../config/database.js";
import User from "./User.js";
import DataConnection from "./DataConnection.js";
import TableConnection from "./TableConnection.js";
import ApiKey from "./ApiKey.js";

// User → DataConnections
User.hasMany(DataConnection, { foreignKey: "user_id", as: "connections" });
DataConnection.belongsTo(User, { foreignKey: "user_id", as: "owner" });

// User → TableConnections
User.hasMany(TableConnection, { foreignKey: "user_id", as: "tableMappings" });
TableConnection.belongsTo(User, { foreignKey: "user_id", as: "owner" });

// User → ApiKeys
User.hasMany(ApiKey, { foreignKey: "user_id", as: "apiKeys" });
ApiKey.belongsTo(User, { foreignKey: "user_id", as: "owner" });

// DataConnection → TableConnections
DataConnection.hasMany(TableConnection, {
  foreignKey: "connection_id",
  as: "tables",
});
TableConnection.belongsTo(DataConnection, {
  foreignKey: "connection_id",
  as: "connection",
});

const models = { User, DataConnection, TableConnection, ApiKey };

export { sequelize, User, DataConnection, TableConnection, ApiKey };
export default models;
