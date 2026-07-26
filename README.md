# data-munger-mcp

[![npm version](https://img.shields.io/npm/v/data-munger-mcp)](https://www.npmjs.com/package/data-munger-mcp)
[![CI](https://github.com/jacobEAdamson/data-munger-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/jacobEAdamson/data-munger-mcp/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/jacobEAdamson/data-munger-mcp/branch/master/graph/badge.svg)](https://codecov.io/gh/jacobEAdamson/data-munger-mcp)

**Data munging pipelines for Claude Code.** Load, filter, map, join, and transform data — all inside your AI coding session, no context switching.

## Why

Claude Code can read files, but raw data (YAML, JSON, CSV) isn't useful without reshaping. You can ask Claude to write a script to transform it, but that means:

- Context switch to write and debug a script
- Permission prompts for every shell command
- Exec output floods your conversation
- You own the cleanup

`data-munger-mcp` solves this. Approve the MCP server once, then every munge operation runs silently inside Claude's existing tools — no shell, no new context, no cleanup.

## Installation

### Add to Claude Code

```bash
claude mcp add data-munger-mcp -- npx -y data-munger-mcp
```

### Or add to any MCP client

```json
{
  "mcpServers": {
    "data-munger-mcp": {
      "command": "npx",
      "args": ["-y", "data-munger-mcp"]
    }
  }
}
```

## Tools

### `munge` — pipeline mode

Linear steps, single source, auto-wired. Best for straightforward transforms.

```
load → records → map/sort/limit/group → output
```

### `munge_graph` — DAG mode

Explicit nodes, any topology. Use when you need joins, multiple sources, or branching.

```
load ──▶ records ──┐
                    ├──▶ join ──▶ map ──▶ output
load ──▶ records ──┘
```

### `transform_value` — transform a single value

Apply transforms to a value directly, no file loading needed. Use when you have a value in context and want to format, clean, or transform it — e.g. format a number, strip HTML, apply regex, convert date strings.

## Transforms

Transforms work in `map` fields AND in `transform_value`. Chain them together — each step feeds the next.

| Step | Config | Entry point? | What it does |
|------|--------|:---:|-------------|
| `jsonpath` | `{path: "$.field"}` | ✓ | Extract field from record |
| `concat` | `{values: ["$.a", " - ", "$.b"]}` | ✓ | Concatenate with `$.` refs |
| `template` | `"Hello {{$.name}}"` | ✓ | Liquid template with `$.` refs |
| `regex` | `{pattern, replace}` | | Regex replace on string |
| `html_to_md` | — | | Convert HTML to markdown |
| `upper` / `lower` | — | | Change case |
| `trim` | — | | Trim whitespace |
| `to_number` | — | | Parse numeric string |
| `to_string` | — | | Stringify value |
| `format_number` | `{decimals, prefix, suffix}` | | Number formatting |
| `format_date` | `{output_format}` | | Date formatting |
| `round` | `{decimals?}` | | Round number |
| `truncate` | `{length}` | | Truncate string |
| `base64_encode` / `base64_decode` | — | | Encode/decode Base64 |
| `url_encode` / `url_decode` | — | | Encode/decode URI components |
| `html_escape` / `html_unescape` | — | | Escape/unescape HTML entities |

## Examples

### Quick report from a config file

```json
{
  "pipeline": [
    { "load": { "path": "team.yaml" } },
    { "records": { "jsonpath": "$.members[*]" } },
    { "map": { "fields": [
      { "label": "Name", "value": [{ "jsonpath": "$.name" }] },
      { "label": "Role", "value": [{ "jsonpath": "$.role" }] },
      { "label": "Skills", "value": [{ "jsonpath": "$.skills | join(', ')" }] }
    ]}},
    { "output": { "format": "markdown" } }
  ]
}
```

### Filter active items, sort, limit to top 10

```json
{
  "pipeline": [
    { "load": { "path": "data.yaml" } },
    { "records": { "jsonpath": "$.items[?(@.status == 'active')]" } },
    { "sort": { "by": "name" } },
    { "limit": { "count": 10 } },
    { "output": { "format": "markdown" } }
  ]
}
```

### Join users and orders into one report

```json
{
  "nodes": [
    { "id": "u",  "load": { "path": "users.yaml" } },
    { "id": "o",  "load": { "path": "orders.yaml" } },
    { "id": "r1", "records": { "from": "u", "jsonpath": "$.users[*]" } },
    { "id": "r2", "records": { "from": "o", "jsonpath": "$.orders[*]" } },
    { "id": "j",  "join": { "inputs": { "left": "r1", "right": "r2" }, "on": "user_id" } },
    { "id": "m",  "map": { "from": "j", "fields": [
      { "label": "Name", "value": [{ "jsonpath": "$.name" }] },
      { "label": "Total", "value": [{ "jsonpath": "$.total" }, "to_number", { "format_number": { "decimals": 2, "prefix": "$" } }] }
    ]}},
    { "id": "out", "output": { "from": "m", "format": "markdown" } }
  ]
}
```

### Inline data — no file needed

```json
{
  "pipeline": [
    { "load_string": { "data": "{\"users\": [{\"name\": \"Alice\"}]}" } },
    { "records": { "jsonpath": "$.users[*]" } },
    { "map": { "fields": [
      { "label": "Name", "value": [{ "jsonpath": "$.name" }] }
    ]}},
    { "output": { "format": "markdown" } }
  ]
}
```

### Group and aggregate

```json
{
  "pipeline": [
    { "load": { "path": "orders.json" } },
    { "records": { "jsonpath": "$.orders[*]" } },
    { "group": { "by": "status", "agg": [
      { "field": "total", "op": "sum", "as": "total_revenue" },
      { "field": "id", "op": "count", "as": "order_count" }
    ]}},
    { "output": { "format": "markdown" } }
  ]
}
```

## Supported formats

| Format | Load | Output |
|--------|:----:|:------:|
| JSON | ✓ | ✓ |
| YAML | ✓ | ✓ |
| CSV | ✓ | — |

## Development

```bash
git clone https://github.com/jacobEAdamson/data-munger-mcp
cd data-munger-mcp
npm install
npm run build
npm test
```

## License

MIT