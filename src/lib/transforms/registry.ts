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

// ─── Transform metadata (for describe_transforms) ──────────────────────

export interface TransformMeta {
  description: string;
  /** Config shape: key → type info. Omitted for no-config transforms. */
  configShape?: Record<
    string,
    { type: string; required?: boolean; description?: string }
  >;
  /** Whether the transform accepts $.field references as its first argument. */
  entryPoint?: boolean;
}

const metaRegistry = new Map<string, TransformMeta>();

export function registerTransformMeta(name: string, meta: TransformMeta): void {
  metaRegistry.set(name, meta);
}

export function getAllTransformMetas(): { name: string; meta: TransformMeta }[] {
  const result: { name: string; meta: TransformMeta }[] = [];
  for (const name of metaRegistry.keys()) {
    const meta = metaRegistry.get(name);
    if (meta) result.push({ name, meta });
  }
  // Stable sort: config transforms first, then alpha
  result.sort((a, b) => {
    const aHas = a.meta.configShape ? 1 : 0;
    const bHas = b.meta.configShape ? 1 : 0;
    if (aHas !== bHas) return bHas - aHas;
    return a.name.localeCompare(b.name);
  });
  return result;
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
