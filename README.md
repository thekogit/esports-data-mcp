# Esports Data MCP

This MCP server provides standardized data interfaces for competitive esports analytics, enabling seamless integration with betting platforms, statistical models, and live dashboards.

## Core Capabilities
- **Multi-Title Support:** Unified ingestion pipelines for major esports titles:
  - **Dota 2:** Professional hero data, matchups, draft analysis, role identification, and live match data.
  - **Valorant:** Match tracking, tournament listings, and team/player information from vlr.gg.
  - **Multi-Title Rosters:** Advanced team information fetching including current player rosters and coaching staff for major titles.
  - **Data Analysis:** Built-in analytical tools to process raw match data into actionable betting insights.
  - **Live Integration:** Capability to fetch and parse real-time match data from major providers.

  ## Available Tools

  ### Dota 2
  - `get_dota2_heroes`: List all Dota 2 heroes with IDs.
  - `get_dota2_leagues`: List active tournaments.
  - `get_dota2_live_matches`: Real-time score and stats.
  - `search_dota2_teams`: Find team IDs by name.
  - `get_dota2_team_info`: Detailed historical team data.
  - `get_dota2_team_roster`: **New!** Fetch current player roster and coach from Liquipedia.
  - `analyze_dota2_draft`: Head-to-head hero matchup analysis.
  - `identify_dota2_roles`: AI-driven position assignment (1-5).

  ### Counter-Strike 2 (CS2)
  - `get_cs2_matches`: Live scorebot and upcoming matches.
  - `get_cs2_team_info`: Detailed team profiles including rosters, coaches, and rankings from HLTV.
  - `get_cs2_player_stats`: Historical performance metrics for players.
  - `get_cs2_map_performance`: Team/player stats on specific maps.

  ### Valorant
  - `get_valo_matches`: Live and upcoming matches from vlr.gg.
  - `get_valo_events`: Tournament listings by tier.
  - `get_valo_team_info`: Detailed team profiles, including rosters and coaches from vlr.gg.
  - `get_valo_player_info`: Individual player stats and history.
  - `get_valo_match_history`: Recent results for form analysis.

  ### League of Legends (LoL)
  - `get_lol_matches`: Upcoming and ongoing matches from Liquipedia.
  - `get_lol_team_info`: Detailed team profiles, including rosters and coaches from Liquipedia.
  - `get_lol_player_info`: Individual player history and team data.
  - `get_lol_gol_team_stats`: Advanced team stats from Games of Legends (gol.gg).

  ### Overwatch 2
  - `get_ow_live_matches`: Upcoming and live matches from Liquipedia.
  - `get_ow_team_info`: Detailed team profiles, including rosters and coaches from Liquipedia.
  - `get_ow_player_stats`: Player performance metrics from Overbuff.

  ### Marvel Rivals
  - `get_rivals_tournaments`: List current and upcoming tournaments.
  - `get_rivals_team_info`: Detailed team profiles, including rosters and coaches from Liquipedia.
  - `get_rivals_player_stats`: Player statistics and performance data.

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
