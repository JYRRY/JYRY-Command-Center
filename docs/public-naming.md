# JYRY Command Center Naming

This document defines the public naming surface for JYRY Command Center (`jyry-command-center`).

## Public Platform Name

Display name:
- `JYRY Command Center`

Slug and public machine name:
- `jyry-command-center`

Use `jyry-command-center` as the public-facing platform and repo name in:
- README copy
- onboarding docs
- example walkthroughs
- architecture and boundary docs
- CLI help and MCP package descriptions
- app window and dev-shell display copy where that does not change wiring

## JYRY Compatibility Profile

JYRY remains a supported compatibility profile.

Existing JYRY operators can keep using:
- `JYRY_PROJECT_ROOT`
- `jyry-tracker.json`
- the `jyry` CLI alias
- the `tracker:parse:jyry-*` package scripts
- `playbooks/jyry/`

These are compatibility surfaces, not the platform identity.

## Safe Usage Right Now

- New installs should follow the `generic` profile path and `COMMAND_CENTER_*` configuration.
- New installs should use the public parser alias `tracker:parse:project-tasks`, which resolves the public `generic-markdown` parser identity against `docs/roadmap.md`.
- Existing JYRY installs should keep current wiring unless they are intentionally migrating.
- Package ids now use `jyry-command-center` and `jyry-command-center-mcp`.
- The public CLI alias `jyry-command-center` can coexist with the compatibility alias `jyry`.

## Compatibility Notes

The following compatibility details still exist:
- changing the live MCP server registration name used by existing JYRY wiring
- removing the `jyry` CLI alias or the `tracker:parse:jyry-*` aliases
- keeping some JYRY-first runtime identity in place until compatibility-sensitive cutover work is complete

## Related Docs

- [README](../README.md)
- [Public Boundary](public-boundary.md)
- [Architecture Overview](architecture-overview.md)
