# git-detective 🕵️

[![CI](https://github.com/Sillkiin/git-detective/actions/workflows/ci.yml/badge.svg)](https://github.com/Sillkiin/git-detective/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/Model_Context_Protocol-server-7c3aed)](https://modelcontextprotocol.io)
[![npm](https://img.shields.io/npm/v/git-detective-mcp?color=cb3837&logo=npm)](https://www.npmjs.com/package/git-detective-mcp)

**Give Claude, Cursor, or any AI agent a forensic understanding of your Git repo — in one line, with no credentials.**

`git-detective` is a [Model Context Protocol](https://modelcontextprotocol.io) server that turns
raw git history into the kind of analysis you'd otherwise pay a commercial tool for: **hotspots,
change-coupling, code ownership, bus-factor, and file archaeology**. Point it at any local repo and
ask questions in plain language.

```
You:    "I'm about to refactor this repo. What's risky, and what should I read first?"

Claude: → hotspots()        finds the 5 files changed most (where bugs live)
        → change_coupling() finds files that secretly change together
        → ownership()       finds areas only one person understands
        → "Start with src/payments.ts: 47 commits, 1 author (bus-factor 1),
           and it's tightly coupled to billing/webhooks.ts (changed together
           19 times). Read those two together before you touch either."
```

No `git log` archaeology by hand. No SaaS. No API keys. It runs locally on the repos you already have.

---

## Why this exists

Git already knows where your bugs live, which modules are secretly entangled, and who the codebase
can't afford to lose. That signal is just buried in `git log`. Existing tools either make you read
raw history yourself or push you to a paid dashboard.

`git-detective` hands that signal to the AI you're *already talking to*. Because the analysis lands
as structured data inside the model's context, it can reason over it — explain a hotspot, draft a
refactor plan, write a standup summary — instead of just printing a chart.

## 30-second setup

No build, no clone, no credentials. Add it to your MCP client and you're done.

**Claude Desktop** — add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "git-detective": {
      "command": "npx",
      "args": ["-y", "git-detective-mcp"],
      "env": { "GIT_DETECTIVE_REPO": "/absolute/path/to/your/repo" }
    }
  }
}
```

`GIT_DETECTIVE_REPO` is just a default — every tool also takes a `repo_path`, so you can point it at
any repo per question. Restart your client and ask: *"Give me a repo_overview."*

> **Cursor / Claude Code / other MCP clients:** same command (`npx -y git-detective-mcp`, stdio
> transport). See [docs/clients.md](docs/clients.md).

## What it can tell you

| Tool | Question it answers |
|------|---------------------|
| **`repo_overview`** | "What is this repo — size, age, branch, who's behind it?" |
| **`recent_activity`** | "What changed in the last 2 weeks? Write me a standup / release note." |
| **`file_history`** | "Why does this file look like this? Who's touched it and when?" |
| **`search_commits`** | "Who removed the retry logic last month?" (message, author, date, or code pickaxe) |
| **`commit_detail`** | "Show me exactly what commit a1b2c3 changed, and its full message." |
| **`hotspots`** | "Which files are riskiest — changed so often they concentrate bugs?" |
| **`change_coupling`** | "Which files secretly change together and reveal hidden dependencies?" |
| **`ownership`** | "Who owns this directory, and what's the bus-factor if they leave?" |
| **`author_activity`** | "Profile one contributor: footprint, active span, month-by-month timeline." |
| **`stale_files`** | "Which tracked files haven't changed in months — dead code or drifted docs?" |

## Example prompts to try

- *"Run repo_overview and recent_activity, then summarize this project for a new hire."*
- *"What are the top 10 hotspots? For each, tell me whether it has a single-author bus-factor risk."*
- *"Show me change_coupling. Are any of these pairs in different modules? That's a design smell."*
- *"Use search_commits with touching_code='TODO' — when did we add the most tech debt?"*
- *"Trace file_history for src/auth.ts and explain how its responsibilities grew over time."*

## See it in action

Run the narrated walkthrough against any repo (no MCP client needed):

```bash
npm run build
npm run demo -- /path/to/any/repo
```

```
🕵️  git-detective  —  analyzing /path/to/repo

📊  repo_overview
────────────────────────────────────────────────────────────
1,284 commits · 312 files · 14 contributors · 903 days old · branch main
languages: TypeScript 61%  CSS 12%  Markdown 9%  JSON 7%

🔥  hotspots  — where bugs and complexity concentrate
────────────────────────────────────────────────────────────
   84 commits  src/server/router.ts   (2 authors, 4,931 lines)  ⚠ bus-factor 1
   61 commits  src/db/schema.ts       (5 authors, 2,210 lines)
   58 commits  src/auth/session.ts    (1 author,  1,803 lines)  ⚠ bus-factor 1

🔗  change_coupling  — files that secretly change together
────────────────────────────────────────────────────────────
   92% of the time  src/auth/session.ts ↔ src/db/schema.ts   (53 shared commits)

👤  ownership  — who knows this code, and the bus-factor
────────────────────────────────────────────────────────────
  bus-factor 2 · 14 contributors
```

> Recording a GIF for your own repo:
> `asciinema rec -c "node scripts/demo.mjs /path/to/repo" demo.cast`, then convert with `agg`.

## How it works

```
MCP client (Claude / Cursor)
        │  stdio (JSON-RPC)
        ▼
   git-detective  ──►  git -C <repo> log --numstat ...   (read-only, no shell)
        │
        ▼
  hotspots · coupling · ownership · history   (pure analysis in TypeScript)
```

- **Read-only.** It only ever *reads* git history (`log`, `rev-list`, `shortlog`, `ls-files`). It
  never writes, commits, pushes, or touches your working tree.
- **No shell, no injection.** Every git call uses `execFile` with an argument array — repo paths and
  filters can't be interpreted as shell syntax.
- **Local & private.** Nothing leaves your machine. No network calls, no telemetry, no accounts.

The analytics borrow ideas from Adam Tornhill's *Your Code as a Crime Scene*: change frequency
(hotspots) and temporal coupling are better risk predictors than size or static complexity alone.

## Run from source

```bash
git clone https://github.com/Sillkiin/git-detective.git
cd git-detective
npm install
npm run build
npm test          # 22 unit tests, no repo required

# point it at any repo and try a query:
GIT_DETECTIVE_REPO=/path/to/repo npm start
```

## FAQ

**Does it need GitHub access or a token?** No. It reads your *local* git history. Private repos work
fine because nothing leaves your machine.

**Will it slow down on a huge repo?** Queries accept a `since` window (e.g. `"6 months ago"`) and
commit caps, so you can scope big histories. Hotspots/coupling read one `git log` pass.

**Does it work with monorepos?** Yes — scope any tool to a subdirectory via `path` / `repo_path`.

**Isn't this just `git log`?** `git log` gives you raw events. `git-detective` gives you *analysis*
(risk ranking, hidden coupling, bus-factor) as structured data an LLM can reason over.

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Good first issues: a `complexity`
signal for hotspots, an `author_activity` tool, or a `stale_files` finder.

## License

MIT © [Sillkiin](https://github.com/Sillkiin)
