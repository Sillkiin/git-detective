#!/usr/bin/env node
/**
 * git-detective — a zero-config MCP server that gives an AI agent deep
 * analytical access to a Git repository: overview, recent activity, file
 * archaeology, hotspots, change-coupling, ownership/bus-factor, and commit
 * search. No credentials. Works on any local repo.
 *
 * Transport: stdio (the standard for local MCP servers).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { resolveRepo } from "./git.js";
import {
  repoOverview,
  recentActivity,
  fileHistory,
  searchCommits,
  commitDetail,
  hotspots,
  coupling,
  ownership,
} from "./queries.js";

const server = new McpServer({
  name: "git-detective",
  version: "0.1.0",
});

/** Optional repo_path shared by every tool. */
const repoPathArg = z
  .string()
  .optional()
  .describe(
    "Path to the git repository. Defaults to GIT_DETECTIVE_REPO, then the " +
      "server's working directory."
  );

function jsonResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

function errorResult(message: string) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

/** Run a tool body with repo resolution + uniform error handling. */
async function withRepo(
  name: string,
  repoPath: string | undefined,
  fn: (repo: string) => Promise<unknown>
) {
  try {
    const repo = await resolveRepo(repoPath);
    return jsonResult(await fn(repo));
  } catch (e) {
    return errorResult(`${name} failed: ${(e as Error).message}`);
  }
}

server.tool(
  "repo_overview",
  "Get a high-level snapshot of a git repo: current branch, total commits, " +
    "tracked file count, age, and top contributors. Start here to orient.",
  { repo_path: repoPathArg },
  async ({ repo_path }) => withRepo("repo_overview", repo_path, (repo) => repoOverview(repo))
);

server.tool(
  "recent_activity",
  "Summarize what changed recently — perfect for standups, release notes, or " +
    "catching up after time away. Returns commit count, active authors, the " +
    "most-touched files, and the latest commits in a time window.",
  {
    repo_path: repoPathArg,
    since: z
      .string()
      .optional()
      .describe('Time window git understands, e.g. "7 days ago", "2 weeks ago", "2024-01-01". Default "14 days ago".'),
    max_commits: z.number().int().min(1).max(1000).optional().describe("Cap commits scanned (default 200)."),
  },
  async ({ repo_path, since, max_commits }) =>
    withRepo("recent_activity", repo_path, (repo) =>
      recentActivity(repo, since ?? "14 days ago", max_commits ?? 200)
    )
);

server.tool(
  "file_history",
  "Trace the full history of one file across renames: who changed it, how " +
    "often, and the commit log. Use it to understand why a file looks the way " +
    "it does before editing it.",
  {
    repo_path: repoPathArg,
    path: z.string().describe("Repo-relative path to the file, e.g. src/index.ts."),
    max_commits: z.number().int().min(1).max(1000).optional().describe("Max commits to return (default 100)."),
  },
  async ({ repo_path, path, max_commits }) =>
    withRepo("file_history", repo_path, (repo) => fileHistory(repo, path, max_commits ?? 100))
);

server.tool(
  "search_commits",
  "Search the commit history by message text, author, date, and/or a code " +
    'string (pickaxe: commits that added or removed that string). Combine ' +
    "filters to answer questions like 'who removed the retry logic last month?'.",
  {
    repo_path: repoPathArg,
    message: z.string().optional().describe("Case-insensitive substring to match in commit messages."),
    author: z.string().optional().describe("Filter by author name or email substring."),
    since: z.string().optional().describe('Only commits after this, e.g. "30 days ago".'),
    touching_code: z
      .string()
      .optional()
      .describe("Find commits that changed the number of occurrences of this exact code string."),
    max_commits: z.number().int().min(1).max(500).optional().describe("Max results (default 50)."),
  },
  async ({ repo_path, message, author, since, touching_code, max_commits }) =>
    withRepo("search_commits", repo_path, (repo) =>
      searchCommits(repo, {
        message,
        author,
        since,
        touchingCode: touching_code,
        maxCommits: max_commits ?? 50,
      })
    )
);

server.tool(
  "commit_detail",
  "Inspect a single commit in full: author, date, the complete message body, and " +
    "a per-file breakdown of lines added/removed. Use it to dig into a specific " +
    "commit surfaced by search_commits, recent_activity, or file_history.",
  {
    repo_path: repoPathArg,
    ref: z
      .string()
      .describe("Commit hash or revision (e.g. a SHA, HEAD, HEAD~3, or a tag)."),
  },
  async ({ repo_path, ref }) =>
    withRepo("commit_detail", repo_path, (repo) => commitDetail(repo, ref))
);

server.tool(
  "hotspots",
  "Find the riskiest files: those changed most frequently. Frequently-edited " +
    "files concentrate bugs and complexity, so this is where reviews, tests, " +
    "and refactoring pay off most. Returns churn, distinct authors, and recency.",
  {
    repo_path: repoPathArg,
    since: z.string().optional().describe('Limit to a window, e.g. "6 months ago". Omit for full history.'),
    limit: z.number().int().min(1).max(100).optional().describe("How many hotspots to return (default 20)."),
  },
  async ({ repo_path, since, limit }) =>
    withRepo("hotspots", repo_path, (repo) => hotspots(repo, since, limit ?? 20))
);

server.tool(
  "change_coupling",
  "Reveal hidden dependencies: pairs of files that keep changing together in " +
    "the same commits. Strong coupling between files in different modules often " +
    "signals a leaky abstraction or a refactor waiting to happen.",
  {
    repo_path: repoPathArg,
    since: z.string().optional().describe('Limit to a window, e.g. "1 year ago". Omit for full history.'),
    limit: z.number().int().min(1).max(100).optional().describe("How many coupled pairs to return (default 20)."),
    min_shared: z.number().int().min(2).max(100).optional().describe("Minimum shared commits to count as coupled (default 3)."),
  },
  async ({ repo_path, since, limit, min_shared }) =>
    withRepo("change_coupling", repo_path, (repo) =>
      coupling(repo, since, limit ?? 20, min_shared ?? 3)
    )
);

server.tool(
  "ownership",
  "Show who owns a file or directory and how concentrated that knowledge is, " +
    "including a bus-factor (how many people you'd lose before the area is " +
    "orphaned). Omit path for the whole repo.",
  {
    repo_path: repoPathArg,
    path: z.string().optional().describe("Repo-relative file or directory. Omit to analyze the whole repo."),
  },
  async ({ repo_path, path }) =>
    withRepo("ownership", repo_path, (repo) => ownership(repo, path))
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr — stdout is reserved for the MCP protocol.
  console.error("git-detective MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting git-detective:", err);
  process.exit(1);
});
