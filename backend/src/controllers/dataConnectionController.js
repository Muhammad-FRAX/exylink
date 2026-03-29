import { DataConnection, User } from "../models/index.js";
import { Sequelize, Op } from "sequelize";

/**
 * Controller for managing database connections.
 * Non-admin users see only their own connections.
 * Admins see their own connections first, then all other users' connections.
 */
class DataConnectionController {
  /**
   * Get connections scoped to the requesting user.
   * Admins receive { own: [...], others: [...] }.
   * Visitors receive { own: [...], others: [] }.
   */
  async getAll(req, res) {
    try {
      const own = await DataConnection.findAll({
        where: { user_id: req.user.id },
        order: [["created_at", "DESC"]],
      });

      let others = [];
      if (req.user.role === "admin") {
        others = await DataConnection.findAll({
          where: { user_id: { [Op.ne]: req.user.id } },
          include: [{ model: User, as: "owner", attributes: ["username"] }],
          order: [["created_at", "DESC"]],
        });
      }

      res.json({ own, others });
    } catch (error) {
      console.error("Failed to fetch connections:", error.message);
      res.status(500).json({ error: "Failed to fetch connections" });
    }
  }

  /**
   * Create a new database connection owned by the requesting user.
   */
  async create(req, res) {
    try {
      const { name, dialect, host, port, username, password, database_name, storage_path } = req.body;
      const connection = await DataConnection.create({
        name, dialect, host, port, username, password, database_name, storage_path,
        user_id: req.user.id,
      });
      res.status(201).json(connection);
    } catch (error) {
      console.error("Failed to create connection:", error.message);
      res.status(500).json({ error: "Failed to create connection" });
    }
  }

  /**
   * Update a connection. Users can only update their own; admins can update any.
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const where =
        req.user.role === "admin"
          ? { id }
          : { id, user_id: req.user.id };

      const { name, dialect, host, port, username, password, database_name, storage_path, is_active } = req.body;
      const [updated] = await DataConnection.update(
        { name, dialect, host, port, username, password, database_name, storage_path, is_active },
        { where }
      );

      if (updated) {
        const updatedConnection = await DataConnection.findByPk(id);
        return res.json(updatedConnection);
      }
      return res.status(404).json({ error: "Connection not found" });
    } catch (error) {
      console.error("Failed to update connection:", error.message);
      res.status(500).json({ error: "Failed to update connection" });
    }
  }

  /**
   * Delete a connection. Users can only delete their own; admins can delete any.
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const where =
        req.user.role === "admin"
          ? { id }
          : { id, user_id: req.user.id };

      const deletedCount = await DataConnection.destroy({ where });

      if (deletedCount === 0) {
        return res.status(404).json({ error: "Connection not found" });
      }

      res.json({ message: "Connection deleted successfully" });
    } catch (error) {
      console.error("Failed to delete connection:", error.message);
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

      const tempSequelize = new Sequelize({ ...config, logging: false });
      await tempSequelize.authenticate();
      await tempSequelize.close();

      res.json({ success: true, message: "Connection successful." });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

export default new DataConnectionController();
