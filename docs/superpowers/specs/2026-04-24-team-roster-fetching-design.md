# Design Spec - Esports Team Roster Fetching (with Coach)

## Purpose
Add a standardized tool across all game-specific MCP servers to fetch the most up-to-date team rosters, including active players and the head coach. This is critical for accurate match analysis and betting insights.

## Architecture
We will use a **Hybrid Data Source** approach (Approach 1 from brainstorming) to balance speed and accuracy.

### 1. Unified Utility Upgrade (`src/utils/liquipedia.ts`)
The `getLiquipediaRoster` function will be refactored to parse Liquipedia's complex HTML tables more robustly.
*   **Input:** `game: string`, `teamName: string`
*   **Logic:** 
    *   Fetch team page.
    *   Locate the "Active" players table.
    *   Locate the "Staff" or "Organization" table to find "Coach" or "Head Coach".
*   **Output Format:**
    ```typescript
    interface TeamRoster {
      players: Array<{
        id: string;      // In-game name
        name?: string;    // Real name
        role?: string;    // Position (e.g., IGL, Support, Carry)
      }>;
      coach: string | null;
      lastUpdated: string; // From the Liquipedia page if available, or current timestamp
    }
    ```

### 2. Game-Specific Integration Plans

#### CS2 (`src/cs2.ts`)
*   **Tool:** `get_cs2_team_info` (existing)
*   **Change:** Ensure the `coach` property from the `HLTV.getTeam()` response is clearly mapped and returned.

#### Dota 2 (`src/dota2.ts`)
*   **Tool:** `get_dota2_team_roster` (new)
*   **Logic:**
    1.  Search OpenDota for `teamId`.
    2.  If `teamId` is found, fetch players from OpenDota.
    3.  Simultaneously fetch from Liquipedia using the team name to get the coach.
    4.  Merge data (OpenDota for player stats/IDs, Liquipedia for the coach).

#### Valorant (`src/valo.ts`)
*   **Tool:** `get_valo_team_info` (update)
*   **Change:** Update the `cheerio` selectors to include the `Staff` section of `vlr.gg` team pages, which lists coaches.

#### LoL, Overwatch, Marvel Rivals
*   **Tool:** `get_<game>_team_info` (update)
*   **Change:** Update to use the improved `getLiquipediaRoster` utility.

### 3. README and Documentation
*   Update the `README.md` to reflect the new capabilities and tool names.
*   Ensure the documentation explains that data is pulled live from HLTV, VLR.gg, and Liquipedia to guarantee it's "up-to-date".

## Error Handling
*   If a team is not found on Liquipedia, fallback to basic API data (if available).
*   Handle rate limiting on scrapers with graceful error messages.

## Testing Strategy
*   Add unit tests in `src/utils/liquipedia.test.ts` with mocked HTML for different Liquipedia table layouts.
*   Verify that `coach` is present in the output for a known team (e.g., "Team Liquid" or "G2 Esports").
