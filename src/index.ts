#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerAll } from './lib/register.js';
import { registerMungeTool } from './tools/munge.js';
import { registerMungeGraphTool } from './tools/munge-graph.js';
import { registerTransformValueTool } from './tools/transform-value.js';

// Register all node handlers and value transforms
registerAll();

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8')) as { version: string };

const server = new McpServer(
  {
    name: 'data-munger-mcp',
    version: pkg.version,
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

registerMungeTool(server);
registerMungeGraphTool(server);
registerTransformValueTool(server);

const transport = new StdioServerTransport();
await server.connect(transport);
