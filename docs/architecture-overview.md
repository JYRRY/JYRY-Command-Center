# JYRY Command Center Architecture Overview

JYRY Command Center (`jyry-command-center`) is a tracker-driven desktop and MCP platform.

## Core Surfaces

- Electron app: reads and visualizes the tracker in real time
- MCP server and CLI: expose tracker operations to agents and operator tooling
- Script layer: bootstrap, parser, backup, and validation helpers
- Profile manifests: define consumer-specific tracker and docs resolution

## Resolution Model

- Runtime, MCP, scripts, and bootstrap all resolve the active consumer profile from the same manifest shape.
- `generic` is the public fresh-install path.
- `jyry` is the compatibility profile for existing JYRY wiring.
- Parser/profile validation and backup-before-write happen in the script layer before tracker mutation.

## Key Docs

- [Public Boundary](public-boundary.md)
- [Profiles](profile-system-design.md)
- [Public Naming](public-naming.md)
- [Task Workflow](task-workflow.md)
- [Three-Phase Task Workflow](three-phase-workflow.md)
- [Troubleshooting](troubleshooting.md)
