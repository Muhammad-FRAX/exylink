import { Sequelize } from "sequelize";
import "dotenv/config";

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite",
  logging: false,
  define: {
    underscored: true,
    timestamps: true,
  },
});

export default sequelize;
