# Promotion kit

Ready-to-paste copy for launching `git-detective` honestly. Adjust the voice to your own — these are
starting points, not scripts. **Post where it's genuinely on-topic, engage with replies, and never ask
for stars directly.**

---

## Show HN

**Title** (HN likes plain and specific — no hype words, ~80 char max):

```
Show HN: Git-detective – give your AI agent forensic insight into any Git repo
```

**First comment** (post immediately after submitting):

> I kept asking Claude things like "what's risky in this repo before I refactor?" and realized git
> already knows — the signal is just buried in `git log`. So I built git-detective, a zero-config MCP
> server that turns git history into analysis and hands it to whatever AI agent you already use
> (Claude Desktop, Cursor, Claude Code).
>
> Ten read-only tools: hotspots (files changed so often they concentrate bugs), change-coupling
> (files that secretly change together → hidden dependencies), ownership + bus-factor, file history
> across renames, commit search with a code pickaxe, stale-file finder, and per-author activity.
>
> It's deliberately frictionless: `npx -y git-detective-mcp`, no credentials, nothing leaves your
> machine. It only ever reads history (no writes/commits/network), and every git call uses execFile
> with an arg array so paths/filters can't become shell. The analytics lean on Adam Tornhill's "Your
> Code as a Crime Scene" idea that change-frequency and temporal coupling predict risk better than
> size or static complexity.
>
> Repo: https://github.com/Sillkiin/git-detective — TypeScript, MIT. Would love feedback on which
> analyses you'd actually use, and what's missing.

**Timing:** weekday mornings US-Eastern (roughly 13:00–16:00 UTC) tend to do best. Post once; don't
repost if it doesn't catch.

---

## Reddit

### r/ClaudeAI / r/mcp

**Title:** `I built an MCP server that gives Claude forensic insight into any git repo (hotspots, coupling, bus-factor)`

> Sharing a side project: **git-detective**, a zero-config MCP server. Point Claude at any local repo
> and ask "what's risky here?" — it answers with hotspots, files that secretly change together,
> ownership/bus-factor, and more. No credentials, `npx -y git-detective-mcp`, nothing leaves your
> machine.
>
> 10 read-only tools, the analysis lands as structured data Claude can reason over (explain a hotspot,
> draft a refactor plan, write the standup). MIT-licensed, feedback very welcome on what analyses
> you'd want next.
>
> https://github.com/Sillkiin/git-detective

### r/programming (lead with the idea, not the tool — this sub is allergic to self-promo)

**Title:** `Change-frequency and temporal coupling predict bugs better than file size — so I exposed them to my AI agent`

> Open the body with the *concept* (why hotspots/coupling matter, citing Tornhill's "Your Code as a
> Crime Scene"), then mention the tool as how you put it into practice. Link last.

---

## MCP directory submissions

Short description (≤160 chars):

> Zero-config MCP server that gives AI agents forensic insight into any Git repo: hotspots,
> change-coupling, ownership, bus-factor, and file archaeology. No credentials.

Where to submit:

- **modelcontextprotocol.io** servers list — open a PR to the registry/awesome list.
- **github.com/punkpeye/awesome-mcp-servers** — PR adding it under an "Analytics" / "Dev tools" section.
- **mcpservers.org** — submission form.
- **glama.ai/mcp/servers** — auto-indexes public GitHub MCP servers; ensure the repo topic `mcp` is set (it is).
- **smithery.ai** — add a `smithery.yaml` and submit.

Suggested awesome-list line:

```
- [git-detective](https://github.com/Sillkiin/git-detective) — Forensic Git analysis: hotspots,
  change-coupling, ownership/bus-factor, and file archaeology. Zero-config, read-only.
```

---

## X / Bluesky / LinkedIn

> Git already knows where your bugs live and which modules are secretly entangled — it's just buried
> in `git log`.
>
> git-detective is a zero-config MCP server that hands that signal to your AI agent: hotspots,
> change-coupling, bus-factor, file archaeology.
>
> npx -y git-detective-mcp · MIT · no credentials
> 🔗 github.com/Sillkiin/git-detective

Attach the demo GIF (see README "See it in action" for how to record it). A repo without a visual
converts far worse than one with a 15-second loop.

---

## Honest-growth checklist

- [ ] Record and commit a real demo GIF, embed it at the top of the README.
- [ ] Publish to npm so `npx` works for everyone (`npm login && npm publish`).
- [ ] Submit to the MCP directories above.
- [ ] Show HN + the two subreddits, spaced a day or two apart.
- [ ] Reply to every comment/issue quickly in the first 48h — engagement is what compounds.
- [ ] Open 2–3 "good first issue" tickets so the repo looks alive and invites contribution.

Never buy stars, run star-exchanges, or ask for stars directly — it violates GitHub's ToS, and for a
contest it's fraud. Real, durable stars come from the project being genuinely useful and easy to try.
