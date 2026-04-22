# Design Spec: Accurate Dota 2 Role Identification

## Problem
The current Dota 2 match parser in the MCP assigns player positions (1-5) based on the order they appear in the Hawk Live HTML/JSON. This is often incorrect as the listing order usually reflects the draft order or alphabetical order, not the game positions. For example, a Pos 1 Carry (like Faceless Void) might be listed 5th, leading the MCP to mislabel them as Pos 5 (Hard Support).

## Goal
Correctly identify and label player roles (Carry, Mid, Offlane, Soft Support, Hard Support) for any given match.

## Proposed Solution

### 1. Hero Role Knowledge Base
We will use hero role data from OpenDota (or a curated local mapping) to understand which roles each hero is capable of playing.

### 2. Role Assignment Algorithm (The "Position Solver")
For a team of 5 heroes, we will determine the most likely assignment of Pos 1-5 by:
1.  Fetching typical positions for each hero.
2.  Generating all possible permutations (5! = 120) of hero-to-position assignments.
3.  Scoring each permutation based on how well the heroes fit those positions.
4.  Choosing the highest-scoring assignment.

### 3. OpenDota Live API Enrichment
For live matches, we will attempt to find the match on OpenDota's `/live` endpoint. If found, we can use the `team_slot` or `fantasy_role` data which is more likely to be accurate.

## Implementation Plan

### Phase 1: Data Acquisition
- Update `src/dota2.ts` to fetch and cache hero role data from OpenDota.
- Create a `HeroPositionMap` utility with typical positions for all 120+ heroes.

### Phase 2: Position Solver
- Implement `solvePositions(heroes: string[]): Record<string, number>` in a new utility `src/utils/dota2_roles.ts`.
- The solver will use a scoring matrix:
    - Hero is a "natural" at the position: +10
    - Hero "can" play the position: +5
    - Hero "rarely" plays the position: -5
    - Hero "never" plays the position: -20

### Phase 3: Integration
- Update `parseHawkLiveMatch` in `src/utils/hawk_live.ts` to use the `solvePositions` utility.
- Add a new tool `identify_dota2_roles` to the MCP for independent use.

## Verification
- Test with the problematic match: Nemiga Gaming (Techies, Disruptor, Slardar, Axe, Faceless Void).
- The solver should correctly identify Faceless Void as Pos 1.
