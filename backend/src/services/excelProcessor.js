import ExcelJS from "exceljs";

/**
 * ExcelProcessor service to extract and normalize data from Excel/CSV files.
 * Provides granular control over data range selection.
 */
class ExcelProcessor {
  /**
   * Parse an Excel/CSV file and extract its content.
   * @param {string} filePath - Path to the file.
   * @param {Object} options - { sheetName, cellRange, hasHeaders }
   * @returns {Promise<{headers: string[], rows: any[][]}>} Cleaned data.
   */
  async parseExcelFile(filePath, options = {}) {
    const workbook = new ExcelJS.Workbook();
    const isCSV = filePath.toLowerCase().endsWith(".csv");

    if (isCSV) {
      await workbook.csv.readFile(filePath);
    } else {
      await workbook.xlsx.readFile(filePath);
    }

    const worksheet = options.sheetName
      ? workbook.getWorksheet(options.sheetName)
      : workbook.worksheets[0];

    if (!worksheet) {
      throw new Error(`Sheet "${options.sheetName || 1}" not found`);
    }

    let headers = [];
    let rows = [];

    // Range-based extraction logic
    if (options.cellRange) {
      const { startRow, endRow, startCol, endCol } = this._parseRange(
        options.cellRange
      );

      for (let r = startRow; r <= endRow; r++) {
        const row = worksheet.getRow(r);
        const rowValues = [];
        for (let c = startCol; c <= endCol; c++) {
          rowValues.push(this._cleanCellValue(row.getCell(c).value));
        }

        if (r === startRow && options.hasHeaders !== false) {
          headers = this._normalizeHeaders(rowValues);
        } else {
          rows.push(rowValues);
        }
      }
    } else {
      // Full sheet extraction if no range provided
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const rowValues = row.values
          .slice(1)
          .map((val) => this._cleanCellValue(val));
        if (rowNumber === 1 && options.hasHeaders !== false) {
          headers = this._normalizeHeaders(rowValues);
        } else {
          rows.push(rowValues);
        }
      });
    }

    if (options.hasHeaders === false && rows.length > 0) {
      headers = rows[0].map((_, idx) => `column_${idx + 1}`);
    }

    return { headers, rows };
  }

  /**
   * Internal helper to parse ranges like 'A1:C10' into numeric coordinates.
   */
  _parseRange(range) {
    const parts = range.split(":");
    if (parts.length !== 2)
      throw new Error("Invalid Range format. Use 'A1:C10'");

    const decode = (ref) => {
      const match = ref.match(/([A-Z]+)(\d+)/);
      if (!match) throw new Error(`Invalid Cell Reference: ${ref}`);

      const colStr = match[1];
      let col = 0;
      for (let i = 0; i < colStr.length; i++) {
        col = col * 26 + (colStr.charCodeAt(i) - 64);
      }
      return { row: parseInt(match[2]), col };
    };

    const start = decode(parts[0]);
    const end = decode(parts[1]);

    return {
      startRow: start.row,
      endRow: end.row,
      startCol: start.col,
      endCol: end.col,
    };
  }

  /**
   * Cleans individual cell values, handling ExcelJS objects (hyperlinks, formulas, etc).
   */
  _cleanCellValue(value) {
    if (value === null || value === undefined) return null;

    // Handle ExcelJS objects (Formula, Hyperlink, Rich Text)
    if (typeof value === "object" && !(value instanceof Date)) {
      if (value.result !== undefined) return value.result; // For formulas
      if (value.text !== undefined) return value.text; // For hyperlinks
      if (value.richText) return value.richText.map((rt) => rt.text).join("");
      return JSON.stringify(value); // Fallback for other objects
    }

    return value;
  }

  /**
   * Helper to normalize header names for database compatibility.
   * Eliminates spaces and special characters.
   */
  _normalizeHeaders(headers) {
    return headers.map((header) => {
      if (!header) return "unnamed_column";
      return String(header)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/gi, "");
    });
  }
}

const processor = new ExcelProcessor();
export const processExcelFile = processor.parseExcelFile.bind(processor);
export default processor;
