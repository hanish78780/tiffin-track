/**
 * Utilities for parsing, normalizing, and validating customer CSV imports (T4).
 */

/**
 * Normalizes phone numbers:
 * - Strips whitespace, dashes, parentheses, dots
 * - Handles country code +91 / 91 and leading 0 for Indian phone numbers
 * - Validates 10-digit format
 * @param {string} raw
 * @returns {string|null} 10-digit phone string or null if invalid
 */
const normalizePhone = (raw) => {
  if (!raw || typeof raw !== "string") return null;

  // Remove common separators and formatting
  let cleaned = raw.trim().replace(/[\s\-\(\)\.]/g, "");

  // Strip international +91 or 91 prefix for 10-digit Indian numbers
  if (cleaned.startsWith("+91") && cleaned.length === 13) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  // Must be exactly 10 digits
  if (/^\d{10}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
};

/**
 * Normalizes date strings into UTC midnight Date objects.
 * Handles:
 * - YYYY-MM-DD, YYYY/MM/DD
 * - DD/MM/YYYY, D/M/YYYY
 * - DD-MM-YYYY, D-M-YYYY
 * - MM/DD/YYYY (when day > 12)
 *
 * In Indian business context, DD/MM/YYYY is the standard format.
 * @param {string} raw
 * @returns {Date|null}
 */
const normalizeDate = (raw) => {
  if (!raw || typeof raw !== "string") return null;
  const str = raw.trim();

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    return createUtcDate(year, month, day);
  }

  // 2. Day-Month-Year format: DD/MM/YYYY, DD-MM-YYYY, D/M/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (dmyMatch) {
    let p1 = parseInt(dmyMatch[1], 10);
    let p2 = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);

    // If p1 > 12, p1 is definitely day, p2 is month (DD/MM/YYYY)
    // If p2 > 12, p2 is day, p1 is month (MM/DD/YYYY)
    // Otherwise standard Indian convention: p1 is day, p2 is month
    let day = p1;
    let month = p2;
    if (p1 <= 12 && p2 > 12) {
      day = p2;
      month = p1;
    }

    return createUtcDate(year, month, day);
  }

  return null;
};

const createUtcDate = (year, month, day) => {
  if (year < 2000 || year > 2100) return null;
  if (month < 1 || month > 12) return null;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return null;

  return new Date(Date.UTC(year, month - 1, day));
};

/**
 * Parses raw CSV string into array of rows with line numbers.
 * Supports quoted fields with commas.
 * @param {string} csvText
 * @returns {Array<{rowNumber: number, data: Object}>}
 */
const parseCSV = (csvText) => {
  if (!csvText || typeof csvText !== "string") return [];

  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map((h) => h.trim().toLowerCase());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // skip empty line

    const values = parseCSVLine(line);
    const rowObj = {};
    headers.forEach((header, index) => {
      rowObj[header] = values[index] !== undefined ? values[index].trim() : "";
    });

    rows.push({
      rowNumber: i + 1, // 1-indexed (header is row 1)
      data: rowObj
    });
  }

  return rows;
};

/**
 * Splits a single CSV line honoring quotes
 */
const parseCSVLine = (line) => {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};

module.exports = {
  normalizePhone,
  normalizeDate,
  parseCSV,
  parseCSVLine
};
