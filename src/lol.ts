import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { fetchHtml } from './utils/fetcher';
import * as cheerio from 'cheerio';

const server = new Server(
  { name: "lol-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_lol_counters",
        description: "Scrape OP.GG for champion counters",
        inputSchema: {
          type: "object",
          properties: { championName: { type: "string" } },
          required: ["championName"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_lol_counters") {
    const champ = (request.params.arguments?.championName as string).toLowerCase();
    const html = await fetchHtml(`https://op.gg/champions/${champ}/counters`).catch(() => null);
    if (!html) return { content: [{ type: "text", text: "Failed to fetch data" }] };
    
    const $ = cheerio.load(html);
    const counters: string[] = [];
    $('.champion-box .name').each((i, el) => {
      counters.push($(el).text().trim());
    });
    return { content: [{ type: "text", text: JSON.stringify(counters.length > 0 ? counters : ["No counters found or parsing failed"], null, 2) }] };
  }
  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LoL MCP Server running");
}

main().catch(console.error);
