import { Liquid } from 'liquidjs';
import type { NodeMeta } from '../engine.js';

export const nodeMeta: NodeMeta = {
  description: 'Render records through a Liquid template. Produces a string.',
  inputSlots: [{ name: 'main', description: 'Array of records' }],
  config: {
    template: { type: 'string', required: true, description: 'Liquid template string. Use {{ field_name }} for record fields.' },
  },
};

const engine = new Liquid();

/** Strip $. prefix from template variables so {{$.field}} → {{field}} */
function stripDollar(tmpl: string): string {
  return tmpl.replace(/\{\{\s*\$\./g, '{{').replace(/\{%\s*\$\./g, '{%');
}

export function templateNode(
  config: Record<string, unknown>,
  inputs: Record<string, unknown>,
): string {
  const records = inputs.main as Record<string, unknown>[];
  const tmpl = config.template as string;
  return engine.parseAndRenderSync(stripDollar(tmpl), { records });
}