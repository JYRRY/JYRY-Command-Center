# JYRY Compatibility Playbook Mirror

This directory is the Phase 1, non-breaking mirror of the live JYRY command-center playbook.
It ships inside `jyry-command-center` so the public platform can keep the JYRY operator path documented as a compatibility profile.

Current state:
- The live Command Center still runs from the `jyry` repo.
- No MCP wiring, CLI wrapper, tracker path, parser path, or runtime path was changed by this mirror.
- Files here are duplicated from the live JYRY setup so `jyry-command-center` contains the full operator/agent playbook alongside the Electron app and MCP server.

Mirrored sources:
- `jyry/AGENTS.md`
- `jyry/CLAUDE.md`
- `jyry/COMMAND-CENTER-GUIDE.md`
- `jyry/.claude/commands/*`
- `jyry/.claude/rules/*`
- `jyry/.claude/agents/*`

Phase 1 rule:
- Treat the JYRY repo as the live source of truth.
- Treat this directory as a mirrored copy for consolidation and public-repo preparation.
- Do not remove or re-point the live JYRY copies until a later compatibility phase is complete.

Phase 2 drift control:
- Run `npm run playbook:check` from the repo root to compare this mirror against the live JYRY playbook.
- Override the source path with `JYRY_PLAYBOOK_SOURCE_ROOT=/absolute/path/to/jyry` when needed.
