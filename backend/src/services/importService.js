import { Sequelize, DataTypes } from "sequelize";
import { processExcelFile } from "./excelProcessor.js";
import { DataConnection } from "../models/index.js";
import fs from "fs/promises";

/**
 * Service to handle dynamic data injection into target databases.
 * Supports PostgreSQL, MySQL, SQLite, and more.
 */
class ImportService {
  /**
   * Resolve DB config from storage, manual input, or static fallback.
   */
  async getDBConfig(options = {}) {
    const { connectionId, manualConfig } = options;

    // 1. Prioritize manual configuration (passed via Manual Entry tab)
    if (manualConfig && manualConfig.dialect) {
      return manualConfig.dialect === "sqlite"
        ? { dialect: "sqlite", storage: manualConfig.storagePath }
        : {
            dialect: manualConfig.dialect,
            host: manualConfig.host,
            port: manualConfig.port,
            username: manualConfig.username,
            password: manualConfig.password,
            database: manualConfig.databaseName,
          };
    }

    // 2. Fallback to stored connection if ID provided
    if (connectionId) {
      const conn = await DataConnection.findByPk(connectionId);
      if (conn) {
        return conn.dialect === "sqlite"
          ? { dialect: "sqlite", storage: conn.storage_path }
          : {
              dialect: conn.dialect,
              host: conn.host,
              port: conn.port,
              username: conn.username,
              password: conn.password,
              database: conn.database_name,
            };
      }
    }

    // 3. Sandbox static config (Emergency fallback)
    return {
      dialect: "postgres",
      host: "localhost",
      port: 5444,
      username: "qast",
      password: "Welcome@123",
      database: "QAST-BI",
      logging: false,
    };
  }

  /**
   * Main background processing function.
   * Runs independently of the request-response cycle.
   */
  async processJob(filePath, options = {}) {
    console.log(`Starting background processing for: ${filePath}`);

    try {
      // 1. Parse the file
      const { headers, rows } = await processExcelFile(filePath, options);
      console.log(`Extracted ${rows.length} rows with ${headers.length} headers.`);

      // 2. Connect to target database
      const config = await this.getDBConfig(options);
      const targetSequelize = new Sequelize({ ...config, logging: false });

      try {
        await targetSequelize.authenticate();
        console.log("Connected to target database.");

        const qi = targetSequelize.getQueryInterface();
        const targetTable = options.targetTableName || "imported_data";

        // 3. Create the table if it does not exist yet.
        //    We never ALTER existing tables so pre-existing schemas are preserved.
        const existingTables = await qi.showAllTables();
        const tableExists = existingTables
          .map((t) => (typeof t === "string" ? t : t.tableName ?? t))
          .includes(targetTable);

        if (!tableExists) {
          const columnDefs = {};
          headers.forEach((header) => {
            columnDefs[header] = { type: DataTypes.TEXT, allowNull: true };
          });
          await qi.createTable(targetTable, columnDefs);
          console.log(`Created table: ${targetTable}`);
        } else {
          console.log(`Table exists, inserting into: ${targetTable}`);
        }

        // 4. Bulk insert via queryInterface — no Sequelize model needed,
        //    so there are no PK/RETURNING column conflicts with existing tables.
        const CHUNK_SIZE = 500;
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
          const records = rows.slice(i, i + CHUNK_SIZE).map((row) => {
            const obj = {};
            headers.forEach((header, idx) => {
              obj[header] = row[idx] !== undefined ? String(row[idx]) : null;
            });
            return obj;
          });
          await qi.bulkInsert(targetTable, records);
        }

        console.log(`Successfully injected ${rows.length} rows.`);
      } catch (dbError) {
        console.error("Database injection error:", dbError.message);
        throw dbError;
      } finally {
        await targetSequelize.close();
      }

      // 5. Cleanup temporary file
      await fs.unlink(filePath);
      console.log("Cleaned up temporary file.");
    } catch (error) {
      console.error("Background process failed:", error.message);
    }
  }
}

export default new ImportService();
