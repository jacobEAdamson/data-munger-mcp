import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// ── Path resolution ──────────────────────────────────────────────
// In dist:  dist/tools/examples.js  →  ../examples/  =  dist/examples/
// In src:   src/tools/examples.ts   →  ../examples/  =  src/examples/
// Mirror structure means same relative path works for both.
const __dirname = dirname(fileURLToPath(import.meta.url));
const examplesDir = resolve(__dirname, '../examples');

// ── Types ────────────────────────────────────────────────────────
interface ExampleMeta {
  name: string;
  description: string;
}

interface ExampleFile {
  filename: string; // e.g. "filter-sort-limit.md"
  content: string;
  meta: ExampleMeta;
}

// ── Simple frontmatter parser ────────────────────────────────────
/**
 * Parse YAML frontmatter from a markdown file.
 * Only extracts `name:` and `description:` — no full YAML parser needed.
 * Missing fields fall back to filename / first heading.
 */
function parseFrontmatter(
  content: string,
  filename: string,
): { meta: ExampleMeta; body: string } {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);

  let name = filename.replace(/\.md$/, '');
  let description = '';
  let body = content;

  if (frontmatterMatch) {
    const raw = frontmatterMatch[1];
    body = content.slice(frontmatterMatch[0].length);

    // Extract name (looks for "name: value")
    const nameMatch = raw.match(/^name:\s*(.+)$/m);
    if (nameMatch) name = nameMatch[1].trim();

    // Extract description
    const descMatch = raw.match(/^description:\s*(.+)$/m);
    if (descMatch) description = descMatch[1].trim();
  }

  // Fallback description: first non-empty line after first heading
  if (!description) {
    const lines = body.split('\n').filter((l) => l.trim().length > 0);
    const headingEnd = lines.findIndex((l) => /^#{1,6}\s/.test(l));
    const start = headingEnd >= 0 ? headingEnd + 1 : 0;
    const para = lines.slice(start).find((l) => !/^#{1,6}\s/.test(l));
    description = para?.trim() ?? '';
  }

  return { meta: { name, description }, body };
}

// ── Load all examples from disk ─────────────────────────────────
function loadAllExamples(): ExampleFile[] {
  let files: string[];
  try {
    files = readdirSync(examplesDir).filter((f) => f.endsWith('.md'));
  } catch {
    return [];
  }

  return files
    .map((filename) => {
      const fullPath = resolve(examplesDir, filename);
      const content = readFileSync(fullPath, 'utf-8');
      const { meta, body } = parseFrontmatter(content, filename);
      return { filename, content, meta, body };
    })
    .sort((a, b) => a.meta.name.localeCompare(b.meta.name));
}

// ── Zod schemas ──────────────────────────────────────────────────
const ExamplesListSchema = z.object({});

const ExamplesShowSchema = z.object({
  name: z
    .string()
    .describe(
      'Example name (from frontmatter `name:` field, or filename without .md). Use examples_list to discover available names.',
    ),
});

// ── Tool registrations ───────────────────────────────────────────
export function registerExamplesTools(server: McpServer): void {
  // ── examples_list ──────────────────────────────────────────────
  server.registerTool(
    'examples_list',
    {
      title: 'List Examples',
      description:
        'List all available example munge pipelines with name and description. Use this to discover which example to run with examples_show.',
      inputSchema: ExamplesListSchema,
    },
    () => {
      const all = loadAllExamples();

      if (all.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No examples found. Build the project (`npm run build`) to populate the examples directory.',
            },
          ],
        };
      }

      const lines = all.map(
        (ex) =>
          `- **${ex.meta.name}** — ${ex.meta.description}`,
      );

      return {
        content: [
          {
            type: 'text',
            text: `# Available Examples\n\n${lines.join('\n')}\n\nUse \`examples_show\` with a name to view the full example.`,
          },
        ],
      };
    },
  );

  // ── examples_show ──────────────────────────────────────────────
  server.registerTool(
    'examples_show',
    {
      title: 'Show Example',
      description:
        'Show a specific example pipeline in full detail. Pass the example name from examples_list.',
      inputSchema: ExamplesShowSchema,
    },
    (input: unknown) => {
      const parsed = ExamplesShowSchema.safeParse(input);
      if (!parsed.success) {
        return {
          content: [
            { type: 'text', text: `Invalid input: ${parsed.error.message}` },
          ],
          isError: true,
        };
      }

      const { name } = parsed.data;
      const all = loadAllExamples();
      const match = all.find((ex) => ex.meta.name === name);

      if (!match) {
        const available = all.map((ex) => `  - ${ex.meta.name}`).join('\n');
        return {
          content: [
            {
              type: 'text',
              text: `Example '${name}' not found.\n\nAvailable examples:\n${available || '  (none — run build first)'}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [{ type: 'text', text: match.content }],
      };
    },
  );
}