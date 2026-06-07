# Contributing to git-detective

Thanks for your interest! This is a small, focused project and contributions are very welcome.

## Development

```bash
npm install
npm run build
npm test
```

Tests use the built-in `node --test` runner over the pure analysis functions — they need no git repo
and run in well under a second. Add a test for any new analysis logic.

## Project layout

```
src/
  index.ts            MCP server + tool registration (thin)
  git.ts              safe git runner + structured log parser (the engine)
  queries.ts          high-level repo questions, returns plain JSON
  analysis/
    hotspots.ts       change-frequency ranking
    coupling.ts       temporal (change) coupling
    ownership.ts      ownership + bus-factor
test/                 unit tests for the parser and analysis
```

## Guidelines

- **Read-only stays read-only.** Tools must never write to a repo or run network calls.
- **No shell.** Use `runGit` (which uses `execFile` with an arg array). Never interpolate user input
  into a shell string.
- Keep functions small and analysis logic pure so it stays testable without a repo.
- Run `npm test` before opening a PR.

## Good first issues

- Add a simple complexity proxy (indentation depth or line count) to hotspot ranking.
- Add an `author_activity` tool (commits-over-time sparkline for one contributor).
- Add a `stale_files` tool (tracked files not changed in N months).
- Surface coupling directionality (A→B vs B→A confidence) separately.
- More client setup recipes in `docs/clients.md`.
