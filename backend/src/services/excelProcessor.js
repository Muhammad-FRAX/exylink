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

    // Simple implementation for extracting data from the worksheet.
    // Enhanced dynamic parsing can be added for specific cell ranges later.
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

    if (options.hasHeaders === false) {
      headers = rows[0].map((_, idx) => `column_${idx + 1}`);
    }

    return { headers, rows };
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
