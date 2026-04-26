# JYRY Command Center Profiles

JYRY Command Center uses a profile system so the same app, MCP server, and
scripts can work across different project conventions without changing the
platform identity.

## What A Profile Does

A profile tells the platform:
- which project root to use
- which tracker filename to read or create
- which docs are expected in the project
- which parser profiles are allowed for script-side writes
- which compatibility aliases remain valid

A profile is not a tracker file, a UI preference bundle, or a parser by itself.

## Current Profiles

### `generic`

The public default for fresh installs.

Defaults:
- project root from `COMMAND_CENTER_PROJECT_ROOT`
- tracker file `command-center-tracker.json`
- roadmap doc `docs/roadmap.md`
- checklist doc `docs/submission-checklist.md`
- manifesto doc `docs/manifesto.md`
- public CLI alias `jyry-command-center`

Parser contract:
- public markdown commands use parser profile `generic`
- public tracker generation requires `docs/roadmap.md`
- tracker metadata is stamped as `generic-markdown:generic`

### `jyry`

The compatibility profile for existing JYRY setups.

Compatibility surfaces:
- `JYRY_PROJECT_ROOT`
- `jyry-tracker.json`
- `jyry` CLI alias
- `tracker:parse:jyry-*` package aliases
- `playbooks/jyry/`

Parser contract:
- JYRY markdown commands use parser profile `jyry`
- tracker metadata is stamped as `jyry-markdown:jyry`

## Resolution Order

Runtime, MCP, bootstrap, and scripts resolve the active profile in the same
order:

1. `COMMAND_CENTER_PROFILE`
2. explicit local config written by bootstrap
3. compatibility inference when no explicit profile exists

Fresh external installs should always use an explicit profile.

## Tracker And Doc Resolution

Each profile defines:
- a primary tracker filename
- accepted compatibility filenames
- the default roadmap/task source path
- the default checklist doc path
- the default manifesto doc path

That keeps the Electron app, MCP tools, bootstrap flow, and parser scripts in
sync.

## Parser Safety Rules

Script-side writes follow these rules:
- parser profile and consumer profile must be compatible
- source-doc selection must be explicit for the command being run
- backup-before-write happens when tracker content changes
- dry-run never writes or creates backups

These rules apply before any script mutates a tracker file.

## Adding A New Profile

To add support for a new external project:

1. Create a new manifest under `profiles/`.
2. Define the tracker filename and doc defaults for that project.
3. Allow only the parser profiles that are valid for that project.
4. Add explicit bootstrap and validation coverage.
5. Update public docs only if the profile is intended to be publicly supported.

## Public Usage

For a fresh external project:
- use `COMMAND_CENTER_PROFILE=generic`
- use `npm run bootstrap -- --project /absolute/path/to/project`
- inspect the result with `npm run tracker:guard:status`
- dry-run the parser before writing

For an existing JYRY setup:
- keep the current wiring in place
- select `COMMAND_CENTER_PROFILE=jyry` only when you intentionally want
  the compatibility path

## Related Docs

- [Architecture Overview](architecture-overview.md)
- [Public Boundary](public-boundary.md)
- [Public Naming](public-naming.md)
- [Task Workflow](task-workflow.md)
- [Troubleshooting](troubleshooting.md)
