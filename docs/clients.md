# Connecting git-detective to MCP clients

`git-detective` speaks MCP over **stdio**, so any MCP-capable client can launch it with
`npx -y git-detective-mcp`. Set `GIT_DETECTIVE_REPO` to a default repo, or pass `repo_path` per call.

## Claude Desktop

Edit `claude_desktop_config.json`
(macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`):

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

Restart Claude Desktop. The tools appear under the 🔌 menu.

## Cursor

Add to `~/.cursor/mcp.json` (or the project's `.cursor/mcp.json`):

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

## Claude Code (CLI)

```bash
claude mcp add git-detective -- npx -y git-detective-mcp
```

Then set a default repo with `--env GIT_DETECTIVE_REPO=/path/to/repo`, or just pass `repo_path` in
your prompts.

## Running from a local checkout

If you've cloned and built the repo, point the client at the built entrypoint instead of npx:

```json
{
  "mcpServers": {
    "git-detective": {
      "command": "node",
      "args": ["/absolute/path/to/git-detective/dist/src/index.js"],
      "env": { "GIT_DETECTIVE_REPO": "/absolute/path/to/your/repo" }
    }
  }
}
```

## Troubleshooting

- **"Not a git repository"** — set `GIT_DETECTIVE_REPO` to an absolute path, or pass `repo_path`.
- **Nothing appears** — fully restart the client after editing its config; MCP servers are spawned at
  startup.
- **`git` not found** — git must be installed and on `PATH` for the account running the client.
