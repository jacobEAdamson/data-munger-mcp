import Papa from 'papaparse';

/**
 * Parse a raw CSV string into an array of record objects.
 * Throws on parse errors or empty data.
 * All values are returned as strings (no dynamic typing).
 */
export function parseCsv(raw: string, label?: string): Record<string, string>[] {
  const parsed = Papa.parse(raw, { header: true, skipEmptyLines: true, dynamicTyping: false });
  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse error: ${parsed.errors[0].message}`);
  }
  if (!parsed.data || parsed.data.length === 0) {
    throw new Error(label ? `CSV ${label} appears empty` : 'CSV data appears empty');
  }
  return parsed.data as Record<string, string>[];
}