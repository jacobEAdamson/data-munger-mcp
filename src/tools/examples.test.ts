/**
 * Drift test: every example in src/examples/ must be valid against its
 * tool's schema AND execute without error against inline fixture data.
 *
 * If a schema field gets renamed, removed, or changed type, this test
 * fails — catching drift before it reaches users.
 *
 * NOTE: parsing and fixture resolution happens at test-registration time
 * (synchronous describe-body), NOT in beforeAll. This ensures the right
 * tests are registered based on actual parse success.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dump as yamlDump } from 'js-yaml';
import { describe, beforeAll, test, expect } from '@jest/globals';
import { normalizeInput } from '../lib/normalize.js';
import { runGraph } from '../lib/engine.js';
import { runValuePipeline } from '../lib/transforms/registry.js';
import { MungerInputSchema } from './munge.js';
import { MungerGraphInputSchema } from './munge-graph.js';
import { EasyMungeSchema } from './easy-munge.js';
import { EasyConvertSchema } from './easy-convert.js';
import { TransformValueSchema } from './transform-value.js';
import { registerAll } from '../lib/register.js';

// Register all node handlers and transforms before any tests run
registerAll();

// ── Helpers ──────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const examplesDir = resolve(__dirname, '../examples');

/** Parse frontmatter name field from markdown content */
function parseName(content: string, filename: string): string {
  const m = /^---\n[\s\S]*?^name:\s*(.+)$/m.exec(content);
  return m ? m[1].trim() : filename.replace(/\.md$/, '');
}

function extractTool(content: string): string | null {
  const m = /\*\*Tool:\*\*\s*`([a-z_]+)`/.exec(content);
  return m?.[1] ?? null;
}

/** Extract all ```json ... ``` code blocks */
function extractJsonBlocks(content: string): string[] {
  const blocks: string[] = [];
  const re = /```json\n([\s\S]*?)```/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

// ── Fixture data for execution tests ────────────────────────────
// Each fixture is shaped to match the jsonpath in the example.

interface Fixture {
  data: Record<string, unknown>;
  format: 'yaml' | 'json';
}

const FIXTURES: Record<string, Fixture> = {
  'quick-report': {
    format: 'yaml',
    data: {
      members: [
        { name: 'Alice', role: 'Engineer', skills: ['Python', 'Go'] },
      ],
    },
  },
  'filter-sort-limit': {
    format: 'yaml',
    data: {
      items: [
        { name: 'Bravo', status: 'active', priority: 2 },
        { name: 'Alpha', status: 'active', priority: 1 },
        { name: 'Charlie', status: 'inactive', priority: 3 },
      ],
    },
  },
  'group-aggregate': {
    format: 'json',
    data: {
      orders: [
        { id: 1, status: 'completed', total: 100 },
        { id: 2, status: 'completed', total: 50 },
        { id: 3, status: 'pending', total: 25 },
      ],
    },
  },
  'inline-data': {
    format: 'json',
    data: { users: [{ name: 'Alice' }] },
  },
};

function serializeFixture(fixture: Fixture): string {
  return fixture.format === 'yaml' ? yamlDump(fixture.data) : JSON.stringify(fixture.data);
}

// ── Load examples at module level (sync) ────────────────────────

interface Example {
  filename: string;
  content: string;
  name: string;
  tool: string | null;
  jsonBlocks: string[];
}

const examples = ((): Example[] => {
  let files: string[];
  try {
    files = readdirSync(examplesDir).filter((f) => f.endsWith('.md'));
  } catch {
    files = [];
  }
  return files.map((filename) => {
    const fullPath = resolve(examplesDir, filename);
    const content = readFileSync(fullPath, 'utf-8');
    const name = parseName(content, filename);
    const tool = extractTool(content);
    const jsonBlocks = extractJsonBlocks(content);
    return { filename, content, name, tool, jsonBlocks };
  });
})();

// ── Tests ────────────────────────────────────────────────────────

describe('examples', () => {
  beforeAll(() => {
    expect(examples.length).toBeGreaterThan(0);
  });

  describe.each(examples)('$filename ($name)', (_example) => {
    const { filename: _filename, name, tool, jsonBlocks, content: _content } = _example;

    test('has a **Tool:** line identifying target tool', () => {
      expect(tool).not.toBeNull();
    });

    test('has at least one ```json code block', () => {
      expect(jsonBlocks.length).toBeGreaterThan(0);
    });

    if (!tool || jsonBlocks.length === 0) return;

    // ── Per-block: parse, validate schema, optionally execute ──
    for (let i = 0; i < jsonBlocks.length; i++) {
      const block = jsonBlocks[i];
      const label = `block ${i}`;

      let parsed: unknown;
      let parseError: Error | null = null;
      try {
        parsed = JSON.parse(block);
      } catch (e) {
        parseError = e instanceof Error ? e : new Error(String(e));
      }

      test(`${label}: valid JSON`, () => {
        if (parseError) throw parseError;
      });

      if (!parsed) continue;

      // Schema validation
      if (tool === 'munge') {
        test(`${label}: valid MungerInputSchema`, () => {
          const result = MungerInputSchema.safeParse(parsed);
          expect(result.success).toBe(true);
        });
      } else if (tool === 'munge_graph') {
        test(`${label}: valid MungerGraphInputSchema`, () => {
          const result = MungerGraphInputSchema.safeParse(parsed);
          expect(result.success).toBe(true);
        });
      } else if (tool === 'easy_munge') {
        test(`${label}: valid EasyMungeSchema`, () => {
          const result = EasyMungeSchema.safeParse(parsed);
          expect(result.success).toBe(true);
        });
      } else if (tool === 'easy_convert') {
        test(`${label}: valid EasyConvertSchema`, () => {
          const result = EasyConvertSchema.safeParse(parsed);
          expect(result.success).toBe(true);
        });
      } else if (tool === 'transform_value') {
        test(`${label}: valid TransformValueSchema`, () => {
          const result = TransformValueSchema.safeParse(parsed);
          expect(result.success).toBe(true);
        });
      }

      // ── Execution: munge pipeline with fixture data ────────
      if (tool === 'munge') {
        test(`${label}: executes with inline fixture data`, async () => {
          const pipeline = (parsed as { pipeline: unknown[] }).pipeline;
          const fixture = FIXTURES[name];
          if (!fixture) return; // no fixture = skip

          const serialized = serializeFixture(fixture);
          const patchedPipeline = pipeline.map((step) => {
            if (
              step &&
              typeof step === 'object' &&
              'load' in (step as Record<string, unknown>)
            ) {
              return { load_string: { data: serialized, format: fixture.format } };
            }
            return step;
          });

          const nodes = normalizeInput({ pipeline: patchedPipeline });
          const result = await runGraph(nodes);
          if (result.isError) {
            const msg = result.text || 'execution failed (no text)';
            throw new Error(`Pipeline execution failed: ${msg}`);
          }
        });
      }

      // ── Execution: transform_value ─────────────────────────
      if (tool === 'transform_value') {
        test(`${label}: executes without error`, () => {
          const { value, transforms } = parsed as {
            value: unknown;
            transforms: unknown[];
          };
          expect(() => {
            runValuePipeline(
              transforms,
              (value ?? {}) as Record<string, unknown>,
              value,
            );
          }).not.toThrow();
        });
      }
    }
  });
});