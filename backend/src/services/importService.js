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
      port: 5444, // Docker mapping fallback
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
    console.log(`🚀 Starting background processing for: ${filePath}`);

    try {
      // 1. Parsing the file (Supports sheetName, cellRange, hasHeaders)
      const { headers, rows } = await processExcelFile(filePath, options);
      console.log(
        `📊 Extracted ${rows.length} rows with ${headers.length} headers.`
      );

      // 2. Establishing connection to target database
      const config = await this.getDBConfig(options);
      const targetSequelize = new Sequelize(config);

      try {
        await targetSequelize.authenticate();
        console.log("🔗 Connected to target database.");

        // 3. Dynamically defining the model
        const attributes = {};
        headers.forEach((header) => {
          attributes[header] = {
            type: DataTypes.TEXT, // Start with TEXT for maximum compatibility
            allowNull: true,
            primaryKey: header.toLowerCase() === "id", // Fix for Sequelize's requirement
          };
        });

        const targetTable = options.targetTableName || "imported_data";
        const DynamicModel = targetSequelize.define(targetTable, attributes, {
          freezeTableName: true,
          timestamps: false, // Disable timestamps to avoid column-not-found on existing tables
        });

        // 4. Syncing the table (creating if absent)
        // force: false ensures we don't delete existing data
        await DynamicModel.sync({ force: options.recreateTable === true });
        console.log(`📝 Synced table: ${targetTable}`);

        // 5. Bulk creating records in chunks for production stability
        const CHUNK_SIZE = 500;
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
          const chunk = rows.slice(i, i + CHUNK_SIZE);
          const records = chunk.map((row) => {
            const obj = {};
            headers.forEach((header, idx) => {
              obj[header] = row[idx] !== undefined ? row[idx] : null;
            });
            return obj;
          });
          await DynamicModel.bulkCreate(records);
        }

        console.log(`✅ Successfully injected ${rows.length} rows.`);
      } catch (dbError) {
        console.error("❌ Database injection error:", dbError.message);
        throw dbError;
      } finally {
        await targetSequelize.close();
      }

      // 6. Cleanup after successful processing
      await fs.unlink(filePath);
      console.log("🧹 Cleaned up temporary file.");
    } catch (error) {
      console.error("❌ background process failed:", error.message);
      // Here we would ideally update an 'ImportJob' record status to 'FAILED'
    }
  }
}

export default new ImportService();
