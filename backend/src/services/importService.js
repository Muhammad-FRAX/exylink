import { Sequelize, DataTypes } from "sequelize";
import { processExcelFile } from "./excelProcessor.js";
import uploadMiddleware from "./uploadService.js";
import fs from "fs/promises";

/**
 * Service to handle dynamic data injection into target databases.
 * Supports PostgreSQL, MySQL, SQLite, and more.
 */
class ImportService {
  /**
   * Static DB config for local testing.
   * Based on your local Docker Postgres setup.
   */
  getStaticConfig() {
    return {
      dialect: "postgres",
      host: "localhost",
      port: 5444, // Using the host port mapped from 5432 in Docker
      username: "qast",
      password: "Welcome@123",
      database: "QAST-BI",
      logging: console.log, // Enabled for testing to see SQL queries
      dialectOptions: {
        // Necessary for some postgres versions or SSL requirements
      },
    };
  }

  /**
   * Main background processing function.
   * Runs independently of the request-response cycle.
   */
  async processJob(filePath, options = {}) {
    console.log(`🚀 Starting background processing for: ${filePath}`);

    try {
      // 1. Parsing the file
      const { headers, rows } = await processExcelFile(filePath, options);
      console.log(
        `📊 Extracted ${rows.length} rows with ${headers.length} headers.`
      );

      // 2. Establishing connection to target database
      const config = this.getStaticConfig();
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
