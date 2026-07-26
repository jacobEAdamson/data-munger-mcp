import { dump as yamlDump } from 'js-yaml';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function outputNode(
  config: Record<string, unknown>,
  inputs: Record<string, unknown>,
): string {
  const main = inputs.main;

  // If input is already a string (e.g. from template node), passthrough
  if (typeof main === 'string') {
    const filePath = config.path as string | undefined;
    if (filePath) {
      const absPath = resolve(filePath);
      mkdirSync(dirname(absPath), { recursive: true });
      writeFileSync(absPath, main, 'utf-8');
      return main + '\n\n---\nWrote to: ' + absPath;
    }
    return main;
  }

  const records = main as Record<string, unknown>[];
  const format = config.format as string | undefined;

  if (!format) {
    throw new Error('Output node requires "format" when input is not a string (from template)');
  }

  let formatted: string;
  switch (format) {
    case 'json':
      formatted = JSON.stringify(records, null, 2);
      break;
    case 'yaml':
      formatted = yamlDump(records);
      break;
    case 'markdown':
      formatted = recordsToMarkdown(records);
      break;
    default:
      throw new Error(`Unsupported output format: ${format}`);
  }

  // Write to file if path specified
  const filePath = config.path as string | undefined;
  if (filePath) {
    const absPath = resolve(filePath);
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, formatted, 'utf-8');
    return formatted + '\n\n---\nWrote to: ' + absPath;
  }

  return formatted;
}

function recordsToMarkdown(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '(no records)';
  const headers = Object.keys(rows[0]);

  const toStr = (v: unknown): string => (v == null ? '' : String(v));

  const widths = headers.map((h) => {
    const vals = rows.map((r) => toStr(r[h]).length);
    return Math.max(h.length, ...vals);
  });

  const hr = '| ' + headers.map((h, i) => h + ' '.repeat(widths[i] - h.length)).join(' | ') + ' |';
  const sep = '| ' + widths.map((w) => '-'.repeat(w)).join(' | ') + ' |';
  const body = rows.map(
    (r) => '| ' + headers.map((h, i) => toStr(r[h]).padEnd(widths[i])).join(' | ') + ' |',
  );

  return [hr, sep, ...body].join('\n');
}
