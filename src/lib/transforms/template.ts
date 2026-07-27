import { Liquid } from 'liquidjs';
import type { TransformFn, TransformMeta } from './registry.js';

export const transformMeta: Record<string, TransformMeta> = {
  template: {
    description: 'Render a Liquid template with $.field references from the record',
    configShape: { template: { type: 'string', required: true, description: 'Liquid template string, e.g. "Hello {{$.name}}"' } },
    entryPoint: true,
  },
};

const engine = new Liquid();

/** Strip $. prefix from template variables so {{$.field}} → {{field}} */
function stripDollar(tmpl: string): string {
  return tmpl.replace(/\{\{\s*\$\./g, '{{').replace(/\{%\s*\$\./g, '{%');
}

export const templateTransform: TransformFn = (_value, record, config) => {
  const tmpl = config as string;
  return engine.parseAndRenderSync(stripDollar(tmpl), record);
};
