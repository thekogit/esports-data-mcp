import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAnalysisTools } from './analysis';
import { registerCS2Tools } from './cs2';
import { registerDota2Tools } from './dota2';
import { registerLolTools } from './lol';
import { registerMarvelRivalsTools } from './marvel_rivals';
import { registerOverwatchTools } from './overwatch';
import { registerValoTools } from './valo';

// 1. Create the unified server
const unifiedServer = new Server(
  { name: "esports-suite", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// 2. Register all tools from modules
registerAnalysisTools(unifiedServer);
registerCS2Tools(unifiedServer);
registerDota2Tools(unifiedServer);
registerLolTools(unifiedServer);
registerMarvelRivalsTools(unifiedServer);
registerOverwatchTools(unifiedServer);
registerValoTools(unifiedServer);

// 3. Start unified server
async function main() {
  const transport = new StdioServerTransport();
  await unifiedServer.connect(transport);
  console.error("Unified Esports Suite MCP Server running");
}

main().catch(console.error);
