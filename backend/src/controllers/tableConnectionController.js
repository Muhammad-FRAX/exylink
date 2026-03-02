import { TableConnection, DataConnection } from "../models/index.js";

/**
 * Controller for managing table specific configurations (connections).
 */
class TableConnectionController {
  /**
   * Get all table connections with their parent data connection info.
   */
  async getAll(req, res) {
    try {
      const connections = await TableConnection.findAll({
        include: [
          {
            model: DataConnection,
            as: "connection",
            attributes: ["name", "dialect"],
          },
        ],
        order: [["created_at", "DESC"]],
      });
      res.json(connections);
    } catch (error) {
      console.error("❌ Failed to fetch table connections:", error.message);
      res.status(500).json({ error: "Failed to fetch table connections" });
    }
  }

  /**
   * Create a new table mapping.
   */
  async create(req, res) {
    try {
      const connection = await TableConnection.create(req.body);
      res.status(201).json(connection);
    } catch (error) {
      console.error("❌ Failed to create table connection:", error.message);
      res.status(500).json({ error: "Failed to create table connection" });
    }
  }

  /**
   * Delete a table mapping.
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const deletedCount = await TableConnection.destroy({ where: { id } });

      if (deletedCount === 0) {
        return res.status(404).json({ error: "Table connection not found" });
      }

      res.json({ message: "Table connection deleted successfully" });
    } catch (error) {
      console.error("❌ Failed to delete table connection:", error.message);
      res.status(500).json({ error: "Failed to delete table connection" });
    }
  }
}

export default new TableConnectionController();
