import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAll } from './lib/register.js';
import { registerMungeTool } from './tools/munge.js';
import { registerMungeGraphTool } from './tools/munge-graph.js';
import { registerTransformValueTool } from './tools/transform-value.js';

// Register all node handlers and value transforms
registerAll();

const server = new McpServer({
  name: 'data-munger-mcp',
  version: '1.0.0',
});

registerMungeTool(server);
registerMungeGraphTool(server);
registerTransformValueTool(server);

const transport = new StdioServerTransport();
await server.connect(transport);
