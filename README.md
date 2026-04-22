# Esports Data MCP

This MCP server provides standardized data interfaces for competitive esports analytics, enabling seamless integration with betting platforms, statistical models, and live dashboards.

## Core Capabilities
- **Multi-Title Support:** Unified ingestion pipelines for major esports titles:
  - Dota 2
  - Counter-Strike 2 (CS2)
  - League of Legends (LoL)
  - Overwatch
  - Valorant
  - Marvel Rivals
- **Data Analysis:** Built-in analytical tools to process raw match data into actionable betting insights.
- **Live Integration:** Capability to fetch and parse real-time match data from major providers.

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/thekogit/esports-data-mcp.git
   cd esports-data-mcp
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configuration:
   Create a `.env` file in the project root based on `.env.example` (if provided) and add your necessary API tokens and service credentials. **Never commit the `.env` file to version control.**

### Running
- Development: `npm run dev`
- Build: `npm run build`
- Run MCP: `node dist/index.js`

## Development
- **Testing:** `npm test`
- **Linting:** `npm run lint`

For detailed technical design and implementation plans, see the `docs/superpowers/` directory.
