import type { InternalNode, NodeHandler, NodeResult } from './types.js';

// ─── Registry ────────────────────────────────────────────────────────

const handlers = new Map<string, NodeHandler>();

export function registerNodeHandler(type: string, handler: NodeHandler): void {
  handlers.set(type, handler);
}

// ─── Error ───────────────────────────────────────────────────────────

export class NodeError extends Error {
  constructor(
    public readonly nodeId: string,
    message: string,
  ) {
    super(`Node '${nodeId}': ${message}`);
    this.name = 'NodeError';
  }
}

// ─── Normalization ───────────────────────────────────────────────────

/**
 * Normalize a raw node config into an InternalNode.
 * `rawConfig` is everything under the type key, e.g. `{ path: "x.yaml" }`.
 */
export function normalizeNode(
  id: string,
  type: string,
  rawConfig: Record<string, unknown>,
): InternalNode {
  const inputSlots: Record<string, string> = {};
  const slotOrder: string[] = [];

  // Extract multi-slot inputs
  if (rawConfig.inputs && typeof rawConfig.inputs === 'object') {
    const inputs = rawConfig.inputs as Record<string, string>;
    for (const key of Object.keys(inputs)) {
      inputSlots[key] = inputs[key];
      slotOrder.push(key);
    }
    rawConfig = { ...rawConfig };
    delete rawConfig.inputs;
  }

  // Extract single-slot input
  if (rawConfig.from && typeof rawConfig.from === 'string') {
    inputSlots.main = rawConfig.from;
    slotOrder.push('main');
    rawConfig = { ...rawConfig };
    delete rawConfig.from;
  }

  return { id, type, config: rawConfig, inputSlots, slotOrder };
}

// ─── Dependency resolution ───────────────────────────────────────────

interface DepNode {
  id: string;
  inputSlots: Record<string, string>;
}

/**
 * Walk backward from the output node to find all reachable nodes,
 * then produce a topological execution order.
 * Throws on orphaned nodes (not reachable from output) and cycles.
 */
function resolveExecutionOrder(nodeMap: Map<string, DepNode>, outputId: string): string[] {
  // Find all reachable nodes via backward traversal from output
  const reachable = new Set<string>();
  const queue = [outputId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    if (reachable.has(current)) continue;
    reachable.add(current);

    const node = nodeMap.get(current);
    if (!node) throw new NodeError(current, `Node not found in graph`);

    for (const depId of Object.values(node.inputSlots)) {
      if (!reachable.has(depId)) {
        queue.push(depId);
      }
    }
  }

  // Check for orphaned nodes (nodes declared but not reachable from output)
  for (const nodeId of nodeMap.keys()) {
    if (!reachable.has(nodeId)) {
      throw new NodeError(nodeId, `Orphaned node — not reachable from output`);
    }
  }

  // Topological sort: Kahn's algorithm on the reachable subgraph
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>(); // node → its dependents

  for (const nodeId of reachable) {
    inDegree.set(nodeId, 0);
    adjacency.set(nodeId, []);
  }

  for (const nodeId of reachable) {
    const node = nodeMap.get(nodeId);
    if (!node) throw new NodeError(nodeId, 'Node not found in graph');
    for (const depId of Object.values(node.inputSlots)) {
      // depId must be executed before nodeId
      if (!adjacency.has(depId)) adjacency.set(depId, []);
      adjacency.get(depId)?.push(nodeId);
      inDegree.set(nodeId, (inDegree.get(nodeId) ?? 0) + 1);
    }
  }

  // Kahn's algorithm
  const order: string[] = [];
  const ready = [...inDegree.entries()].filter(([_, deg]) => deg === 0).map(([id]) => id);

  while (ready.length > 0) {
    const current = ready.shift();
    if (current === undefined) break;
    order.push(current);

    for (const dep of adjacency.get(current) ?? /* istanbul ignore next */ []) {
      const newDeg = (inDegree.get(dep) ?? 1) - 1;
      inDegree.set(dep, newDeg);
      if (newDeg === 0) ready.push(dep);
    }
  }

  if (order.length !== reachable.size) {
    throw new NodeError(
      outputId,
      `Graph contains a cycle. Resolved ${order.length} of ${reachable.size} nodes`,
    );
  }

  return order;
}

// ─── Execute ─────────────────────────────────────────────────────────

export interface EngineResult {
  text: string;
  isError: boolean;
}

/**
 * Run a graph of nodes to completion.
 * @param nodes - the normalized internal nodes
 * @returns the output text and whether it errored
 */
export async function runGraph(nodes: InternalNode[]): Promise<EngineResult> {
  const nodeMap = new Map<string, InternalNode>(nodes.map((n) => [n.id, n]));

  // Find output node
  const outputNodes = nodes.filter((n) => n.type === 'output');
  if (outputNodes.length === 0) {
    return { text: 'Graph must have an output node', isError: true };
  }
  if (outputNodes.length > 1) {
    return {
      text: `Graph has ${outputNodes.length} output nodes (expected 1)`,
      isError: true,
    };
  }

  const outputId = outputNodes[0].id;

  // Resolve execution order
  let order: string[];
  try {
    order = resolveExecutionOrder(nodeMap, outputId);
  } catch (err) {
    return {
      text: err instanceof Error ? err.message : String(err),
      isError: true,
    };
  }

  // Execute
  const results = new Map<string, NodeResult>();

  for (const nodeId of order) {
    const node = nodeMap.get(nodeId);
    if (!node) throw new NodeError(nodeId, 'Node not found in graph');
    const handler = handlers.get(node.type);

    if (!handler) {
      return {
        text: `Node '${nodeId}': Unknown node type '${node.type}'`,
        isError: true,
      };
    }

    // Resolve inputs
    const resolvedInputs: Record<string, NodeResult> = {};
    for (const slot of node.slotOrder) {
      const sourceId = node.inputSlots[slot];
      const result = results.get(sourceId);
      if (result === undefined) {
        return {
          text: `Node '${nodeId}': Missing input '${slot}' from node '${sourceId}'`,
          isError: true,
        };
      }
      resolvedInputs[slot] = result;
    }

    try {
      const result = await handler(node.config, resolvedInputs);
      results.set(nodeId, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { text: `Node '${nodeId}': ${msg}`, isError: true };
    }
  }

  const outputResult = results.get(outputId);
  return {
    text: typeof outputResult === 'string' ? outputResult : JSON.stringify(outputResult),
    isError: false,
  };
}
