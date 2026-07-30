// ─── Node types ──────────────────────────────────────────────────────

export type NodeType =
  'load' | 'load_string' | 'records' | 'map' | 'sort' | 'limit' | 'join' | 'group' | 'template' | 'output';

export const NODE_TYPES: NodeType[] = [
  'load',
  'load_string',
  'records',
  'map',
  'sort',
  'limit',
  'join',
  'group',
  'template',
  'output',
];

// ─── Node configs ────────────────────────────────────────────────────

export interface LoadConfig {
  path: string;
  format?: 'yaml' | 'json' | 'csv';
}

export interface LoadStringConfig {
  data: string;
  format?: 'yaml' | 'json' | 'csv';
}

export interface RecordsConfig {
  from?: string;
  jsonpath: string;
}

export interface FieldDef {
  label: string;
  value: unknown[];
}

export interface MapConfig {
  from?: string;
  fields: FieldDef[];
}

export interface SortConfig {
  from?: string;
  by: string;
  desc?: boolean;
}

export interface LimitConfig {
  from?: string;
  count: number;
}

export interface JoinConfig {
  inputs: { left: string; right: string };
  on: string;
  type?: 'inner' | 'left' | 'right';
}

export interface AggDef {
  field: string;
  op: 'sum' | 'count' | 'avg' | 'min' | 'max';
  as?: string;
}

export interface GroupConfig {
  from?: string;
  by: string;
  agg: AggDef[];
}

export interface OutputConfig {
  from?: string;
  format?: 'markdown' | 'json' | 'yaml';
  path?: string;
}

export interface TemplateConfig {
  from?: string;
  template: string;
}

// ─── Value transforms ────────────────────────────────────────────────

export type ValueTransformType =
  | 'jsonpath'
  | 'concat'
  | 'template'
  | 'regex'
  | 'html_to_md'
  | 'upper'
  | 'lower'
  | 'trim'
  | 'to_number'
  | 'to_string'
  | 'to_date'
  | 'format_number'
  | 'format_date'
  | 'round'
  | 'truncate'
  | 'date_add'
  | 'date_diff'
  | 'date_truncate'
  | 'date_tz';

/** A single step in a value pipeline. Either a string (no-config transform) or {type, config}. */
export type ValueTransform =
  | Exclude<
      ValueTransformType,
      | 'jsonpath'
      | 'concat'
      | 'template'
      | 'regex'
      | 'format_number'
      | 'format_date'
      | 'round'
      | 'truncate'
      | 'to_date'
      | 'date_add'
      | 'date_diff'
      | 'date_truncate'
      | 'date_tz'
    >
  | { jsonpath: string }
  | { concat: { values: string[] } }
  | { template: string }
  | { regex: { pattern: string; replace: string } }
  | { format_number: { decimals?: number; prefix?: string; suffix?: string } }
  | { format_date: { output_format: string; timezone?: string } }
  | { round: { decimals?: number } }
  | { truncate: { length: number } }
  | { to_date: { input_format?: string; timezone?: string } }
  | { date_add: { years?: number; months?: number; weeks?: number; days?: number; hours?: number; minutes?: number; seconds?: number; timezone?: string } }
  | { date_diff: { unit: 'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds'; to?: string } }
  | { date_truncate: { unit: string; timezone?: string } }
  | { date_tz: { target: string; source?: string } };

// ─── Pipeline / Graph input shapes ───────────────────────────────────

/** A pipeline step — type is the key, config is the value. */
export type PipelineStep =
  | { load: LoadConfig }
  | { load_string: LoadStringConfig }
  | { records: RecordsConfig }
  | { map: MapConfig }
  | { sort: SortConfig }
  | { limit: LimitConfig }
  | { join: JoinConfig }
  | { group: GroupConfig }
  | { template: TemplateConfig }
  | { output: OutputConfig };

/** A graph node — same as pipeline step but with an id. */
export type GraphNode = { id: string } & PipelineStep;

/** Input to the `munge` tool. */
export interface MungerInput {
  pipeline: PipelineStep[];
}

/** Input to the `munge-graph` tool. */
export interface MungerGraphInput {
  nodes: GraphNode[];
}

// ─── Internal engine types ───────────────────────────────────────────

/** Internal representation of a node after normalization. */
export interface InternalNode {
  id: string;
  type: string;
  config: Record<string, unknown>;
  /** inputSlotName → sourceNodeId */
  inputSlots: Record<string, string>;
  /** Order of input slots for deterministic execution */
  slotOrder: string[];
}

/** Handler result type — can be any value, engine caches it. */
export type NodeResult = unknown;

/** Function signature for a node handler. */

export type NodeHandler = (
  config: Record<string, unknown>,
  inputs: Record<string, NodeResult>,
) => NodeResult | Promise<NodeResult>;

// ─── Output format ───────────────────────────────────────────────────

export type OutputFormat = 'markdown' | 'json' | 'yaml' | 'csv';

// ─── MCP tool response type ────────────────────────────────────────────

/** Return type for MCP tool handlers. Matches the SDK callback contract. */
export interface ToolResponse {
  [x: string]: unknown;
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}
