# Exylink Project Development Context

## Core Feature: Dynamic Excel/CSV to Database Import

Implemented a robust, background-processed import system that allows users to upload spreadsheets and inject them into various databases (PostgreSQL, MySQL, SQLite).

### Backend Implementation Details:

- **`uploadService.js`**: Uses Multer with custom disk storage (under `temp_uploads`). Implements file filtering for `.xlsx`, `.xls`, and `.csv`.
- **`excelProcessor.js`**: Uses `exceljs` to parse workbooks. Features automatic header normalization (lowercase, underscores, sanitization) to ensure database compatibility.
- **`importService.js`**: The heart of the operation.
  - Dynamically creates Sequelize models based on extracted headers.
  - Supports multiple database dialects via static/dynamic configuration.
  - Implements chunked bulk insertion (`bulkCreate`) for handling large datasets efficiently.
  - Runs as a non-blocking background process to keep the API responsive.
- **`fileController.js`**: Coordinates the upload and background task. Returns `202 Accepted` immediately with a timestamp, enabling a smooth, asynchronous User Experience.

### Key Workflows:

1. **Upload**: Client sends `multipart/form-data` to `/api/v1/files`.
2. **Acceptance**: Server returns immediate success; starts processing based on a generated job context.
3. **Parsing**: Spreadsheet is read; columns are normalized for target DB table creation.
4. **Injection**: Target table is synced (re-created if needed) and data is bulk-inserted.
5. **Cleanup**: Temporary files are unlinked after successful ingestion.

### Technologies Used:

- **Backend**: Node.js, Express, Multer, ExcelJS, Sequelize.
- **Frontend**: React, Framer Motion (for feedback animations), Axios.
- **Database Drivers**: `pg`, `pg-hstore`, `mysql2`, `sqlite3`.

---
