export type TransformFn = (
  value: unknown,
  record: Record<string, unknown>,
  config: unknown,
) => unknown;

const registry = new Map<string, TransformFn>();

export function registerTransform(name: string, fn: TransformFn): void {
  registry.set(name, fn);
}

export function getTransform(name: string): TransformFn | undefined {
  return registry.get(name);
}

/** Parse a value transform step into { name, config }. */
export function parseStep(step: unknown): { name: string; config: unknown } {
  if (typeof step === 'string') {
    return { name: step, config: step };
  }
  if (typeof step === 'object' && step !== null) {
    const keys = Object.keys(step);
    if (keys.length !== 1) throw new Error(`Invalid transform step: ${JSON.stringify(step)}`);
    const name = keys[0];
    return { name, config: (step as Record<string, unknown>)[name] };
  }
  throw new Error(`Invalid transform step: ${JSON.stringify(step)}`);
}

/** Run a value pipeline against a record. */
export function runValuePipeline(
  transforms: unknown[],
  record: Record<string, unknown>,
  initialValue?: unknown,
): unknown {
  let value: unknown = initialValue;

  for (const step of transforms) {
    const { name, config } = parseStep(step);
    const fn = getTransform(name);
    if (!fn) throw new Error(`Unknown transform: '${name}'`);

    value = fn(value, record, config);
  }

  return value;
}
