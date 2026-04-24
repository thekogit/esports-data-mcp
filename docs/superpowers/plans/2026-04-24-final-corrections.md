# Esports Betting MCP Final Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore Elo integration, implement bias correction, and fix division-by-zero in the Bayesian analysis engine.

**Architecture:** Update `calculateMatchProbabilities` to accept optional Elo and apply profile-based bias correction. Update tool handlers to pass Elo and ensure safe division.

**Tech Stack:** TypeScript, MCP SDK, Jest.

---

### Task 1: Update `calculateMatchProbabilities` Signature and Baseline Logic

**Files:**
- Modify: `src/analysis.ts`

- [ ] **Step 1: Update function signature to include optional `elo` parameter.**
- [ ] **Step 2: Update baseline probability logic to use Elo if provided.**
- [ ] **Step 3: Implement bias correction logic ('reverse' and 'standard').**
- [ ] **Step 4: Ensure probabilities are clamped between 0.01 and 0.99.**

### Task 2: Update `get_optimal_bet_strategy` Tool Handler

**Files:**
- Modify: `src/analysis.ts`

- [ ] **Step 1: Update the call to `calculateMatchProbabilities` to pass `elo: { a: eloA, b: eloB }`.**

### Task 3: Fix Division-by-Zero in `calculate_bayesian_dirichlet` Tool Handler

**Files:**
- Modify: `src/analysis.ts`

- [ ] **Step 1: Add a safety check for the denominator in `calculate_bayesian_dirichlet`.**

### Task 4: Verification

**Files:**
- Test: `src/analysis.test.ts` (if exists) or run existing tests.

- [ ] **Step 1: Run tests to ensure no regressions.**
- [ ] **Step 2: Manually verify the new logic with a test script if necessary.**

### Task 5: Commit Changes

- [ ] **Step 1: Commit the changes with a descriptive message.**
