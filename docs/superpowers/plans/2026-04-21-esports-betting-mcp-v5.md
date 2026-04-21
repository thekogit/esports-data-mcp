# Esports Betting MCP v5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the esports MCP servers with betting-specific tools (odds, win probability), robust caching, and payload optimization for LLM context efficiency.

**Architecture:** Centralized caching in `fetcher.ts`, tool renaming for consistency across 6 game-specific servers, and result truncation for list-based data.

**Tech Stack:** Node.js, TypeScript, Axios, Cheerio, HLTV SDK.

---

### Task 1: Robust Fetcher with Caching

**Files:**
- Modify: `src/utils/fetcher.ts`
- Test: `src/utils/fetcher.test.ts`

- [ ] **Step 1: Implement caching in fetcher**
- [ ] **Step 2: Update fetcher tests**
- [ ] **Step 3: Run tests**
- [ ] **Step 4: Commit**

---

### Task 2: Update CS2 Server (Stats & Odds)

**Files:**
- Modify: `src/cs2.ts`

- [ ] **Step 1: Rename tools and add new ones**
- [ ] **Step 2: Implement truncation and new logic**
- [ ] **Step 3: Commit**

---

### Task 3: Update LoL Server (Matches & Scrapers)

**Files:**
- Modify: `src/lol.ts`

- [ ] **Step 1: Add get_lol_matches tool**
- [ ] **Step 2: Implement match scraping**
- [ ] **Step 3: Commit**

---

### Task 4: Update Dota 2 & Valorant Servers

**Files:**
- Modify: `src/dota2.ts`, `src/valo.ts`

- [ ] **Step 1: Implement truncation in Dota 2**
- [ ] **Step 2: Add win probability to Valorant matches**
- [ ] **Step 3: Commit**

---

### Task 5: Final Verification

- [ ] **Step 1: Build project**
- [ ] **Step 2: Run verification script**
- [ ] **Step 3: Final Commit**
