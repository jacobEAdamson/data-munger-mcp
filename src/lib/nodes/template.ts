import { Liquid } from 'liquidjs';

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