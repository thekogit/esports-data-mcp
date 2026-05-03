import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import Module from 'module';

// 1. Create the unified server
const unifiedServer = new Server(
  { name: "esports-suite", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const allTools: any[] = [];
const allHandlers: Array<(request: any) => Promise<any>> = [];

// 2. Mock the Server constructor globally before importing the modules
const mockServer = {
  setRequestHandler: (schema: any, handler: any) => {
    if (schema === ListToolsRequestSchema) {
      // Call it immediately to get tools
      handler().then((res: any) => {
        if (res && res.tools) {
          allTools.push(...res.tools);
        }
      }).catch(console.error);
    } else if (schema === CallToolRequestSchema) {
      // Save the handler to try later
      allHandlers.push(handler);
    }
  },
  connect: async () => {}, // prevent actual connection
};

// Override the require cache for the SDK
const originalRequire = (Module as any).prototype.require;
(Module as any).prototype.require = function(id: string) {
  if (id === '@modelcontextprotocol/sdk/server/index.js') {
    return {
      Server: function() {
        return mockServer;
      }
    };
  }
  return originalRequire.apply(this, arguments);
};

// Prevent the process.exit from cs2.ts catching us
const originalProcessExit = process.exit;
(process as any).exit = (code?: number) => {
  // Do nothing to prevent child modules from killing the unified server
};

// 3. Import all the compiled modules
// We use require to ensure synchronous execution and interception
require('./analysis');
require('./cs2');
require('./dota2');
require('./lol');
require('./marvel_rivals');
require('./overwatch');
require('./valo');

// Restore process.exit just in case
(process as any).exit = originalProcessExit;

// 4. Register on the unified server
unifiedServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: allTools };
});

unifiedServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Try each handler until one succeeds or throws a real error (not "Tool not found")
  for (const handler of allHandlers) {
    try {
      const result = await handler(request);
      return result; 
    } catch (e: any) {
      if (e.message === "Tool not found") {
        continue; // Try next handler
      }
      throw e; // Real error from a matching tool
    }
  }
  throw new Error(`Tool not found across all consolidated modules: ${request.params.name}`);
});

// 5. Start unified server
async function main() {
  const transport = new StdioServerTransport();
  await unifiedServer.connect(transport);
  console.error("Unified Esports Suite MCP Server running");
  console.error(`Loaded ${allTools.length} tools from 7 modules.`);
}

main().catch(console.error);
