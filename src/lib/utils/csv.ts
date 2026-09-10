/**
 * CSV export helpers.
 *
 * All exported cells are neutralised against spreadsheet formula
 * injection before writing.
 */

const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/** Neutralise spreadsheet formula injection in a single cell. */
export function neutraliseCsvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  // Strip control characters that can change how spreadsheets parse cells.
  text = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ");
  const first = text.charAt(0);
  if (FORMULA_PREFIXES.includes(first)) {
    text = `'${text}`;
  }
  return text;
}

export function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(csvEscape).join(",");
  const lines = rows.map((row) =>
    row.map((cell) => csvEscape(neutraliseCsvCell(cell))).join(","),
  );
  return [headerLine, ...lines].join("\r\n");
}
