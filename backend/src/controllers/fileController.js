import importService from "../services/importService.js";
import uploadMiddleware from "../services/uploadService.js";

/**
 * Main Controller for file management endpoints.
 */
class FileController {
  /**
   * Orchestrates the Excel file upload and processing.
   * Returns an immediate status code (202 - Accepted) to the client.
   * Actual processing runs as a detached background operation.
   */
  async createFileImport(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Missing required file" });
      }

      console.log(`Received upload: ${req.file.originalname}`);

      // Extract metadata from request body
      const options = {
        sheetName: req.body.sheetName || null,
        cellRange: req.body.cellRange || null,
        hasHeaders: req.body.hasHeaders !== "false",
        targetTableName: req.body.targetTableName || "imported_excel_data",
        connectionId: req.body.connectionId || null,
        // Manual Connection Params
        manualConfig: req.body.connectionId
          ? null
          : {
              dialect: req.body.dialect,
              host: req.body.host,
              port: req.body.port,
              username: req.body.username,
              password: req.body.password,
              databaseName: req.body.databaseName,
              storagePath: req.body.storagePath,
            },
      };

      // 1. Kick off background processing (Detached from response cycle)
      importService
        .processJob(req.file.path, options)
        .then(() =>
          console.log(
            `Background processing for ${req.file.originalname} successful.`
          )
        )
        .catch((err) =>
          console.error(
            `Background processing for ${req.file.originalname} failed: ${err.message}`
          )
        );

      // 2. Immediate response back to the client
      res.status(202).json({
        success: true,
        message: "File accepted for processing.",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        `Controller handling error for ${req.file?.originalname}: ${error.message}`
      );
      res
        .status(500)
        .json({ error: "Job creation failed", details: error.message });
    }
  }
}

export default new FileController();
