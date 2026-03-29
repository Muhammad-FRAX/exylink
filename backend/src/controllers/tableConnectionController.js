import { TableConnection, DataConnection, User } from "../models/index.js";
import { Op } from "sequelize";

/**
 * Controller for managing table specific configurations.
 * Non-admin users see only their own mappings.
 * Admins see their own first, then all other users' mappings.
 */
class TableConnectionController {
  /**
   * Get table connections scoped to the requesting user.
   * Admins receive { own: [...], others: [...] }.
   * Visitors receive { own: [...], others: [] }.
   */
  async getAll(req, res) {
    try {
      const own = await TableConnection.findAll({
        where: { user_id: req.user.id },
        include: [
          {
            model: DataConnection,
            as: "connection",
            attributes: ["name", "dialect"],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      let others = [];
      if (req.user.role === "admin") {
        others = await TableConnection.findAll({
          where: { user_id: { [Op.ne]: req.user.id } },
          include: [
            {
              model: DataConnection,
              as: "connection",
              attributes: ["name", "dialect"],
            },
            {
              model: User,
              as: "owner",
              attributes: ["username"],
            },
          ],
          order: [["created_at", "DESC"]],
        });
      }

      res.json({ own, others });
    } catch (error) {
      console.error("Failed to fetch table connections:", error.message);
      res.status(500).json({ error: "Failed to fetch table connections" });
    }
  }

  /**
   * Create a new table mapping owned by the requesting user.
   */
  async create(req, res) {
    try {
      const { name, connection_id, target_table_name, sheet_name, cell_range, has_headers } = req.body;
      const connection = await TableConnection.create({
        name, connection_id, target_table_name, sheet_name, cell_range, has_headers,
        user_id: req.user.id,
      });
      res.status(201).json(connection);
    } catch (error) {
      console.error("Failed to create table connection:", error.message);
      res.status(500).json({ error: "Failed to create table connection" });
    }
  }

  /**
   * Delete a table mapping. Users can only delete their own; admins can delete any.
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const where =
        req.user.role === "admin"
          ? { id }
          : { id, user_id: req.user.id };

      const deletedCount = await TableConnection.destroy({ where });

      if (deletedCount === 0) {
        return res.status(404).json({ error: "Table connection not found" });
      }

      res.json({ message: "Table connection deleted successfully" });
    } catch (error) {
      console.error("Failed to delete table connection:", error.message);
      res.status(500).json({ error: "Failed to delete table connection" });
    }
  }
}

export default new TableConnectionController();
