import { Liquid } from 'liquidjs';
import type { TransformFn } from './registry.js';

const engine = new Liquid();

/** Strip $. prefix from template variables so {{$.field}} → {{field}} */
function stripDollar(tmpl: string): string {
  return tmpl.replace(/\{\{\s*\$\./g, '{{').replace(/\{%\s*\$\./g, '{%');
}

export const templateTransform: TransformFn = (_value, record, config) => {
  const tmpl = config as string;
  return engine.parseAndRenderSync(stripDollar(tmpl), record);
};
