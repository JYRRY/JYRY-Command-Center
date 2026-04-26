# JYRY Command Center MCP Server

This package contains the MCP server and CLI for JYRY Command Center (`jyry-command-center`).

## Current Status

- Public platform name: `jyry-command-center`
- Compatibility profile: JYRY
- Compatibility CLI alias: `jyry`
- Public CLI alias: `jyry-command-center`
- Package name: `jyry-command-center-mcp`

## Build

```bash
npm install
npm run build
```

## CLI

After building, you can inspect the local CLI help with:

```bash
node dist/cli.js help
```

When the package is linked or installed, both of these aliases resolve to the same CLI:

```bash
jyry-command-center help
jyry help
```

## Compatibility Notes

- The live JYRY MCP wiring is intentionally left unchanged in Phase 4.
- The public alias is additive only.
- Removing the `jyry` alias is a later cutover step, not part of this phase.
