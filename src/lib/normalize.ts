import type { InternalNode } from './types.js';
import { normalizeNode } from './engine.js';

/**
 * Normalize either a pipeline or graph input into InternalNode[].
 * Accepts unknown and validates at runtime for flexibility with Zod schemas.
 */
export function normalizeInput(input: unknown): InternalNode[] {
  if (!input || typeof input !== 'object') {
    throw new Error('Input must be an object with "pipeline" or "nodes"');
  }

  const obj = input as Record<string, unknown>;

  if ('nodes' in obj && Array.isArray(obj.nodes)) {
    return normalizeGraph(obj.nodes as Record<string, unknown>[]);
  }

  if ('pipeline' in obj && Array.isArray(obj.pipeline)) {
    return normalizePipeline(obj.pipeline as Record<string, unknown>[]);
  }

  throw new Error('Input must have "pipeline" or "nodes" array');
}

/**
 * Convert a pipeline (array of steps) to InternalNode[].
 * Auto-generates IDs and wires inputs in order.
 */
function normalizePipeline(steps: Record<string, unknown>[]): InternalNode[] {
  const nodes: InternalNode[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const id = `_${i}`;
    const { type, config } = extractStep(step);

    let rawConfig: Record<string, unknown>;
    if (type === 'load' || type === 'load_string') {
      rawConfig = { ...config };
    } else if (type === 'join') {
      rawConfig = { ...config };
    } else {
      if (i === 0) {
        throw new Error(
          `Pipeline step ${i} ('${type}') has no input. First step must be 'load' or 'load_string'.`,
        );
      }
      rawConfig = { ...config, from: `_${i - 1}` };
    }

    nodes.push(normalizeNode(id, type, rawConfig));
  }

  return nodes;
}

/**
 * Convert a graph node array to InternalNode[].
 */
function normalizeGraph(nodes: Record<string, unknown>[]): InternalNode[] {
  return nodes.map((node) => {
    const { id, type, config } = extractGraphNode(node);
    return normalizeNode(id, type, config);
  });
}

/**
 * Extract the type and config from a pipeline step.
 * Each step is a single-key object, e.g. { load: { path: "x" } }.
 */
function extractStep(step: Record<string, unknown>): {
  type: string;
  config: Record<string, unknown>;
} {
  const keys = Object.keys(step);
  if (keys.length !== 1) {
    throw new Error(`Invalid pipeline step: ${JSON.stringify(step)}`);
  }
  const type = keys[0];
  const config = step[type] as Record<string, unknown>;
  return { type, config };
}

/**
 * Extract type, id, and config from a graph node.
 * Graph nodes look like: { id: "x", load: { path: "x" } }
 */
function extractGraphNode(node: Record<string, unknown>): {
  id: string;
  type: string;
  config: Record<string, unknown>;
} {
  const id = node.id as string;
  if (!id) throw new Error(`Graph node missing 'id': ${JSON.stringify(node)}`);

  const keys = Object.keys(node).filter((k) => k !== 'id');
  if (keys.length !== 1) {
    throw new Error(`Invalid graph node: ${JSON.stringify(node)}`);
  }
  const type = keys[0];
  const config = node[type] as Record<string, unknown>;
  return { id, type, config };
}
