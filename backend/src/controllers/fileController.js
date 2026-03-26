import importService from "../services/importService.js";

/**
 * Controller for file upload and ingestion endpoints.
 */
class FileController {
  /**
   * Stage a job: upload the file, parse it, detect duplicates against the
   * target DB, and return a pre-flight descriptor.
   *
   * The client uses the descriptor to decide whether to confirm or cancel.
   */
  async stageFileImport(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Missing required file" });
      }

      console.log(`Received upload: ${req.file.originalname}`);

      const options = {
        sheetName: req.body.sheetName || null,
        cellRange: req.body.cellRange || null,
        hasHeaders: req.body.hasHeaders !== "false",
        targetTableName: req.body.targetTableName || "imported_excel_data",
        connectionId: req.body.connectionId || null,
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

      const stagingInfo = await importService.stageJob(req.file.path, options);

      // stagingInfo: { jobId, totalRows, duplicateCount, safeRows }
      res.json(stagingInfo);
    } catch (error) {
      console.error(
        `Stage error for ${req.file?.originalname}: ${error.message}`
      );
      res.status(500).json({ error: "Failed to stage job", details: error.message });
    }
  }

  /**
   * Confirm a staged job: run the insertion in the background.
   */
  async confirmFileImport(req, res) {
    const { jobId } = req.params;

    importService
      .confirmJob(jobId)
      .then(() => console.log(`Confirmed job completed: ${jobId}`))
      .catch((err) =>
        console.error(`Confirmed job failed [${jobId}]: ${err.message}`)
      );

    res.status(202).json({ success: true, message: "Ingestion started." });
  }

  /**
   * Cancel a staged job: discard the temp file and drop the staging entry.
   */
  async cancelFileImport(req, res) {
    const { jobId } = req.params;
    await importService.cancelJob(jobId);
    res.json({ message: "Job cancelled." });
  }
}

export default new FileController();
