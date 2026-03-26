import fs from "fs/promises";
import importService from "../services/importService.js";
import { TableConnection, DataConnection } from "../models/index.js";

/**
 * Handles external file ingestion triggered by API key.
 *
 * Supports two modes:
 *
 *  1. Preset mode   — pass preset_id; all DB/sheet settings come from the saved config.
 *  2. Manual mode   — pass connection params + target_table_name directly in the request.
 *
 * In both cases the full stage → confirm pipeline runs automatically (no user interaction).
 */
class IngestController {
  async ingestFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "No file provided.",
          hint: "Send your Excel or CSV as a multipart field named 'file'.",
        });
      }

      const {
        preset_id,
        // manual connection params
        dialect,
        host,
        port,
        username,
        password,
        database_name,
        storage_path,
        // ingestion params (apply to both modes when provided)
        target_table_name,
        sheet_name,
        cell_range,
        has_headers,
      } = req.body;

      let options;
      let resolvedPresetName = null;
      let resolvedTargetTable;

      if (preset_id) {
        // ----------------------------------------------------------------
        // Mode 1: use a saved table config preset
        // ----------------------------------------------------------------
        const preset = await TableConnection.findOne({
          where: { id: preset_id, user_id: req.user.id },
          include: [{ model: DataConnection, as: "connection" }],
        });

        if (!preset) {
          return res.status(404).json({
            error: "Preset not found or does not belong to this API key.",
          });
        }

        options = {
          sheetName: sheet_name || preset.sheet_name || null,
          cellRange: cell_range || preset.cell_range || null,
          hasHeaders: has_headers !== undefined
            ? has_headers !== "false" && has_headers !== "0"
            : preset.has_headers,
          targetTableName: target_table_name || preset.target_table_name,
          connectionId: preset.connection_id,
        };

        resolvedPresetName = preset.name;
        resolvedTargetTable = options.targetTableName;
      } else {
        // ----------------------------------------------------------------
        // Mode 2: fully manual — all params passed in the request
        // ----------------------------------------------------------------
        if (!target_table_name) {
          return res.status(400).json({
            error: "target_table_name is required when not using a preset.",
          });
        }
        if (!dialect) {
          return res.status(400).json({
            error: "dialect is required (postgres, mysql, sqlite, mssql).",
          });
        }
        if (dialect === "sqlite" && !storage_path) {
          return res.status(400).json({
            error: "storage_path is required for the sqlite dialect.",
          });
        }
        if (dialect !== "sqlite" && !database_name) {
          return res.status(400).json({
            error: "database_name is required for the selected dialect.",
          });
        }

        options = {
          sheetName: sheet_name || null,
          cellRange: cell_range || null,
          hasHeaders: has_headers !== "false" && has_headers !== "0",
          targetTableName: target_table_name,
          manualConfig: {
            dialect,
            host: host || null,
            port: port ? Number(port) : null,
            username: username || null,
            password: password || null,
            databaseName: database_name || null,
            storagePath: storage_path || null,
          },
        };

        resolvedTargetTable = target_table_name;
      }

      // Stage (parse + duplicate detection) then immediately confirm
      const preflight = await importService.stageJob(req.file.path, options);
      await importService.confirmJob(preflight.jobId);

      console.log(
        `External ingest via API key [${req.apiKeyRecord.id}]: ` +
          `${preflight.newRows} inserted, ${preflight.updates} updated, ` +
          `${preflight.exactDuplicates} skipped → ${resolvedTargetTable}`
      );

      res.json({
        success: true,
        ...(resolvedPresetName && { preset: resolvedPresetName }),
        targetTable: resolvedTargetTable,
        stats: {
          totalRows: preflight.totalRows,
          inserted: preflight.newRows,
          updated: preflight.updates,
          skipped: preflight.exactDuplicates,
        },
      });
    } catch (err) {
      // Best-effort temp file cleanup if stageJob failed before it could clean up
      if (req.file?.path) {
        fs.unlink(req.file.path).catch(() => {});
      }
      console.error(`External ingest error: ${err.message}`);
      res.status(500).json({ error: "Ingestion failed.", details: err.message });
    }
  }
}

export default new IngestController();
