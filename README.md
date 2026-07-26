# data-munger-mcp

MCP server for data munging pipelines. Load YAML/JSON/CSV, filter with JSONPath, map fields, join datasets, group/aggregate, template, and output as markdown, JSON, or YAML.

## Installation

```bash
npm install -g data-munger-mcp
```

Or run directly with `npx`:

```bash
npx data-munger-mcp
```

## Usage

Configure in your MCP client (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "data-munger-mcp": {
      "command": "npx",
      "args": ["data-munger-mcp"]
    }
  }
}
```

### Tools

| Tool | Description |
|------|-------------|
| `munge` | Run a linear data munging pipeline: load → records → map/sort/limit → output |
| `munge_graph` | Run a DAG pipeline with explicit node wiring, joins, and branching |
| `transform_value` | Test transform chains on single values |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint
```

## License

MIT