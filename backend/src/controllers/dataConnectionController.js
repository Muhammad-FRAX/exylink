import { DataConnection } from "../models/index.js";
import { Sequelize } from "sequelize";

/**
 * Controller for managing database connections.
 */
class DataConnectionController {
  /**
   * Get all database connections.
   */
  async getAll(req, res) {
    try {
      const connections = await DataConnection.findAll({
        order: [["created_at", "DESC"]],
      });
      res.json(connections);
    } catch (error) {
      console.error("❌ Failed to fetch connections:", error.message);
      res.status(500).json({ error: "Failed to fetch connections" });
    }
  }

  /**
   * Create a new database connection.
   */
  async create(req, res) {
    try {
      const connection = await DataConnection.create(req.body);
      res.status(201).json(connection);
    } catch (error) {
      console.error("❌ Failed to create connection:", error.message);
      res.status(500).json({ error: "Failed to create connection" });
    }
  }

  /**
   * Update an existing connection.
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const [updated] = await DataConnection.update(req.body, {
        where: { id },
      });

      if (updated) {
        const updatedConnection = await DataConnection.findByPk(id);
        return res.json(updatedConnection);
      }
      return res.status(404).json({ error: "Connection not found" });
    } catch (error) {
      console.error("❌ Failed to update connection:", error.message);
      res.status(500).json({ error: "Failed to update connection" });
    }
  }

  /**
   * Delete a database connection.
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const deletedCount = await DataConnection.destroy({ where: { id } });

      if (deletedCount === 0) {
        return res.status(404).json({ error: "Connection not found" });
      }

      res.json({ message: "Connection deleted successfully" });
    } catch (error) {
      console.error("❌ Failed to delete connection:", error.message);
      res.status(500).json({ error: "Failed to delete connection" });
    }
  }

  /**
   * Test a database connection before saving.
   */
  async testConnection(req, res) {
    try {
      const {
        dialect,
        host,
        port,
        username,
        password,
        database_name,
        storage_path,
      } = req.body;

      const config =
        dialect === "sqlite"
          ? { dialect, storage: storage_path }
          : {
              dialect,
              host,
              port,
              username,
              password,
              database: database_name,
            };

      const tempSequelize = new Sequelize(config);
      await tempSequelize.authenticate();
      await tempSequelize.close();

      res.json({ success: true, message: "Connection successful." });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

export default new DataConnectionController();
