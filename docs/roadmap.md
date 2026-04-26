# THE BUILD ROADMAP

> JYRY Command Center starter roadmap. Replace these milestones with the
> actual JYRY product plan when ready. The parser at `src/main/parser.ts`
> reads `### WEEK N — Milestone Name` headings and `- [ ] task` checkboxes
> from this section.

### WEEK 1 — Foundation Reset
- [ ] Confirm rebrand is clean across package.json, UI, and tracker output
- [ ] Generate the first `jyry-tracker.json` from this roadmap
- [ ] Open the desktop app and verify swim lane renders the milestones
- [ ] Verify the MCP server CLI prints help under the `jyry-command-center` name

### WEEK 2 — Tracker Integration
- [ ] Wire the JYRY workspace folder via the onboarding screen
- [ ] Validate the file watcher refreshes the UI on external tracker writes
- [ ] Smoke-test commit-and-push from the desktop app
- [ ] Document the JYRY-specific operator flow in `docs/`

### WEEK 3 — Operator Workflow
- [ ] Run `prepare M1 all` against the real JYRY roadmap once it lands
- [ ] Run `auto M1` end-to-end and capture any auditor regressions
- [ ] Add lint, typecheck, and test scripts so the auditor has work to gate on
- [ ] Close M1 with `audit M1`

**Exit Criteria** Tracker generates cleanly from `docs/roadmap.md`, the desktop app opens against the generated tracker, and `jyry-command-center help` runs from the built MCP CLI.

# PARALLEL TRACK — Operations

## ONGOING — Documentation and Examples
- [ ] Keep `examples/minimal-command-center-project` aligned with the public flow
- [ ] Refresh README quickstart whenever the onboarding flow changes
