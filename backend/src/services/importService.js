import { Sequelize, DataTypes, QueryTypes } from "sequelize";
import { processExcelFile } from "./excelProcessor.js";
import { DataConnection } from "../models/index.js";
import { randomUUID, createHash } from "crypto";
import fs from "fs/promises";

/**
 * Service to handle dynamic data injection into target databases.
 * Supports PostgreSQL, MySQL, SQLite, and MSSQL.
 *
 * Duplicate strategy:
 *  - Exact row match (all columns identical)  → skip
 *  - Same primary key, different values        → overwrite (UPDATE)
 *  - No match found                            → insert
 *
 * Detection is hash-based and works regardless of whether an `id`
 * column exists. When an `id` column is present the overwrite path
 * is also available; without one only exact-duplicate skipping runs.
 */
class ImportService {
  constructor() {
    this.stagingJobs = new Map();
    // Purge expired staged jobs every 5 minutes (10-minute TTL)
    setInterval(() => this._purgeExpiredJobs(), 5 * 60 * 1000);
  }

  // ---------------------------------------------------------------------------
  // Internal utilities
  // ---------------------------------------------------------------------------

  _purgeExpiredJobs() {
    const TTL = 10 * 60 * 1000;
    const now = Date.now();
    for (const [id, job] of this.stagingJobs) {
      if (now - job.createdAt > TTL) {
        fs.unlink(job.filePath).catch(() => {});
        this.stagingJobs.delete(id);
        console.log(`Expired staged job purged: ${id}`);
      }
    }
  }

  async _buildConnection(options) {
    const config = await this.getDBConfig(options);
    const seq = new Sequelize({ ...config, logging: false });
    await seq.authenticate();
    return seq;
  }

  /**
   * Returns a quoted identifier for the given dialect.
   */
  _q(identifier, dialect) {
    const q = dialect === "mysql" || dialect === "mariadb" ? "`" : '"';
    return `${q}${identifier}${q}`;
  }

  /**
   * Stable MD5 hash of an ordered list of values.
   * Null/undefined become empty string; everything else is stringified and trimmed.
   * Values are joined with a null-byte separator to prevent collision between
   * e.g. ["a", "bc"] and ["ab", "c"].
   */
  _hashValues(values) {
    const normalised = values.map((v) =>
      v == null ? "" : String(v).trim()
    );
    return createHash("md5").update(normalised.join("\x00")).digest("hex");
  }

  // ---------------------------------------------------------------------------
  // DB config resolution
  // ---------------------------------------------------------------------------

  async getDBConfig(options = {}) {
    const { connectionId, manualConfig } = options;

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

    throw new Error(
      "No database connection provided. Supply a connectionId or manual connection parameters."
    );
  }

  // ---------------------------------------------------------------------------
  // Step 1 — Stage: parse, connect, classify rows
  // ---------------------------------------------------------------------------

  /**
   * Parses the uploaded file, connects to the target database, and classifies
   * every incoming row into one of three buckets:
   *
   *   newRows         → INSERT
   *   upsertRows      → UPDATE (same PK, values changed)
   *   exactDuplicates → skip
   *
   * Returns a lightweight descriptor that the frontend uses to decide whether
   * to prompt the user.
   */
  /**
   * Validates that a table name is safe for use in SQL queries.
   */
  _validateTableName(name) {
    if (!name || !/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/.test(name)) {
      throw new Error(
        `Invalid table name "${name}". Use only letters, digits, and underscores (max 64 chars).`
      );
    }
  }

  async stageJob(filePath, options = {}) {
    const { headers, rows } = await processExcelFile(filePath, options);
    const targetTable = options.targetTableName || "imported_data";
    this._validateTableName(targetTable);

    let newRows = [...rows];
    let upsertRows = [];
    let exactDuplicates = [];

    const seq = await this._buildConnection(options);
    const qi = seq.getQueryInterface();
    const dialect = seq.getDialect();

    try {
      // Discover the table schema
      let tableDescription = null;
      try {
        tableDescription = await qi.describeTable(targetTable);
      } catch {
        // Table doesn't exist yet — every row is new, nothing to compare
      }

      if (tableDescription) {
        const existingCols = new Set(Object.keys(tableDescription));

        // Only fetch and compare columns that exist in BOTH the spreadsheet
        // and the target table. If there's no overlap we skip detection.
        const matchingHeaders = headers.filter((h) => existingCols.has(h));

        if (matchingHeaders.length > 0) {
          const q = this._q.bind(this);
          const selectCols = matchingHeaders
            .map((h) => q(h, dialect))
            .join(", ");

          let existingRows = [];
          try {
            existingRows = await seq.query(
              `SELECT ${selectCols} FROM ${q(targetTable, dialect)}`,
              { type: QueryTypes.SELECT }
            );
          } catch (e) {
            console.log(`Could not fetch existing rows for comparison: ${e.message}`);
          }

          // Build lookup structures using only the matching columns
          // so that hashes are comparable between existing and incoming rows.
          const matchingIndexes = matchingHeaders.map((h) =>
            headers.indexOf(h)
          );
          const idColIndex = headers.indexOf("id");
          const idIsMatching = matchingHeaders.includes("id");

          // Map: hash → true  (for exact-duplicate detection)
          const existingHashSet = new Set();
          // Map: id value → hash  (for PK-conflict detection)
          const existingIdToHash = new Map();

          for (const row of existingRows) {
            const vals = matchingHeaders.map((h) => row[h]);
            const hash = this._hashValues(vals);
            existingHashSet.add(hash);

            if (idIsMatching && row.id != null) {
              existingIdToHash.set(String(row.id), hash);
            }
          }

          // Classify incoming rows
          newRows = [];
          upsertRows = [];
          exactDuplicates = [];

          for (const row of rows) {
            const incomingVals = matchingIndexes.map((i) => row[i]);
            const incomingHash = this._hashValues(incomingVals);

            if (existingHashSet.has(incomingHash)) {
              // All compared columns are identical — exact duplicate
              exactDuplicates.push(row);
            } else if (
              idColIndex >= 0 &&
              idIsMatching &&
              row[idColIndex] != null &&
              existingIdToHash.has(String(row[idColIndex]))
            ) {
              // Same PK but values changed — overwrite
              upsertRows.push(row);
            } else {
              newRows.push(row);
            }
          }
        }
        // If matchingHeaders is empty, all rows are treated as new (no comparison possible)
      }
    } finally {
      await seq.close();
    }

    const jobId = randomUUID();
    this.stagingJobs.set(jobId, {
      filePath,
      options,
      headers,
      newRows,
      upsertRows,
      exactDuplicates,
      createdAt: Date.now(),
    });

    console.log(
      `Job staged [${jobId}]: ` +
        `${rows.length} total | ` +
        `${newRows.length} new | ` +
        `${upsertRows.length} updates | ` +
        `${exactDuplicates.length} exact duplicates`
    );

    // Build duplicate rows as objects for frontend display (cap at 200 for response size)
    const MAX_DUPLICATE_PREVIEW = 200;
    const duplicatePreview = exactDuplicates
      .slice(0, MAX_DUPLICATE_PREVIEW)
      .map((row) => this._rowToRecord(headers, row));

    return {
      jobId,
      totalRows: rows.length,
      newRows: newRows.length,
      updates: upsertRows.length,
      exactDuplicates: exactDuplicates.length,
      duplicateRows: duplicatePreview,
      headers,
    };
  }

  // ---------------------------------------------------------------------------
  // Step 2a — Confirm: execute the classified insertion plan
  // ---------------------------------------------------------------------------

  async confirmJob(jobId) {
    const job = this.stagingJobs.get(jobId);
    if (!job) throw new Error("Job not found or expired");

    const { filePath, options, headers, newRows, upsertRows, exactDuplicates } =
      job;
    const targetTable = options.targetTableName || "imported_data";

    // Log skipped duplicates
    if (exactDuplicates.length > 0) {
      const idIdx = headers.indexOf("id");
      const sample = exactDuplicates
        .slice(0, 10)
        .map((r) => (idIdx >= 0 ? `id=${r[idIdx]}` : JSON.stringify(r)))
        .join(", ");
      console.log(
        `Skipping ${exactDuplicates.length} exact duplicate rows. Sample: ${sample}`
      );
    }

    const seq = await this._buildConnection(options);
    const qi = seq.getQueryInterface();
    const dialect = seq.getDialect();

    try {
      // Create the table if it does not exist
      let tableExists = false;
      try {
        await qi.describeTable(targetTable);
        tableExists = true;
      } catch {
        tableExists = false;
      }

      if (!tableExists) {
        const columnDefs = {};
        headers.forEach((h) => {
          columnDefs[h] = { type: DataTypes.TEXT, allowNull: true };
        });
        await qi.createTable(targetTable, columnDefs);
        console.log(`Created table: ${targetTable}`);
      }

      // --- INSERT new rows ---
      if (newRows.length > 0) {
        const CHUNK = 500;
        for (let i = 0; i < newRows.length; i += CHUNK) {
          const records = newRows.slice(i, i + CHUNK).map((row) =>
            this._rowToRecord(headers, row)
          );
          await qi.bulkInsert(targetTable, records);
        }
        console.log(`Inserted ${newRows.length} new rows.`);
      }

      // --- UPDATE rows (same PK, changed values) ---
      if (upsertRows.length > 0) {
        await this._performUpdates(seq, targetTable, headers, upsertRows, dialect);
        console.log(`Updated ${upsertRows.length} rows.`);
      }
    } finally {
      await seq.close();
      await fs.unlink(filePath).catch(() => {});
      this.stagingJobs.delete(jobId);
    }
  }

  // ---------------------------------------------------------------------------
  // Step 2b — Cancel: discard the staged job
  // ---------------------------------------------------------------------------

  async cancelJob(jobId) {
    const job = this.stagingJobs.get(jobId);
    if (!job) return;
    await fs.unlink(job.filePath).catch(() => {});
    this.stagingJobs.delete(jobId);
    console.log(`Job cancelled: ${jobId}`);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  _rowToRecord(headers, rowArray) {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = rowArray[i] != null ? String(rowArray[i]) : null;
    });
    return obj;
  }

  /**
   * Issues an UPDATE statement for each row that has a conflicting PK.
   * Uses positional `?` replacements which Sequelize normalises per dialect.
   */
  async _performUpdates(seq, targetTable, headers, rows, dialect) {
    const idIdx = headers.indexOf("id");
    if (idIdx < 0) return; // No id column — cannot UPDATE without a PK

    const q = this._q.bind(this);
    const updateCols = headers.filter((h) => h !== "id");
    if (updateCols.length === 0) return;

    const setClauses = updateCols
      .map((h) => `${q(h, dialect)} = ?`)
      .join(", ");
    const sql = `UPDATE ${q(targetTable, dialect)} SET ${setClauses} WHERE ${q("id", dialect)} = ?`;

    for (const row of rows) {
      const record = this._rowToRecord(headers, row);
      const values = [
        ...updateCols.map((h) => record[h] ?? null),
        record.id ?? null,
      ];
      await seq.query(sql, { replacements: values });
    }
  }
}

export default new ImportService();
