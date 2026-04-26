# JYRY Command Center Example Project

This is the smallest public example project for JYRY Command Center (`jyry-command-center`).

It is intentionally simple:
- local-file based
- no live JYRY repo dependency
- uses the public `generic` profile path first
- demonstrates bootstrap, parser, tracker, and dashboard flow

## Files

- `docs/roadmap.md`
- `docs/submission-checklist.md`
- `docs/manifesto.md`

## Bootstrap Flow

From the `jyry-command-center` repo root:

```bash
npm run bootstrap -- --project ./examples/minimal-command-center-project
```

That generates `.env` with:
- `COMMAND_CENTER_PROFILE=generic`
- `COMMAND_CENTER_PROJECT_ROOT` pointed at this example project
- `COMMAND_CENTER_TASKS_DOC=docs/roadmap.md`
- default public doc paths for checklist and manifesto
- no `JYRY_PROJECT_ROOT` entry

If you want to inspect the generated env first, add `--output-env-file /tmp/command-center.env`.

## Parser + Tracker Flow

1. Run `npm run tracker:guard:status`.
2. Dry-run the parser before any write:

```bash
npm run tracker:parse:project-tasks:dry-run
```

The dry-run output should include `Parser/source pairing: generic-markdown:generic`.
The public generic path always reads `docs/roadmap.md` as the task source for the tracker.

3. Write the tracker:

```bash
npm run tracker:parse:project-tasks
```

4. Start the desktop app.

## JYRY Compatibility

JYRY remains the compatibility profile for existing installs.
This example is the public walkthrough and should not require `JYRY_PROJECT_ROOT`, `jyry-tracker.json`, or a sibling JYRY checkout.
The tracker written by the public path is stamped with `parser_id=generic-markdown` and `parser_profile=generic`.
The legacy `tracker:parse:jyry-tasks` alias still exists for compatibility, but new users should follow the public `tracker:parse:project-tasks` path first.
