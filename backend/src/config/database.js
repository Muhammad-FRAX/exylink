import { Sequelize } from "sequelize";
import { fileURLToPath } from "url";
import path from "path";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH =
  process.env.NODE_ENV === "production"
    ? path.resolve("/app/data/database.sqlite")
    : path.resolve(__dirname, "../database/database.sqlite");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: DB_PATH,
  logging: false,
  define: {
    underscored: true,
    timestamps: true,
  },
});

export default sequelize;
