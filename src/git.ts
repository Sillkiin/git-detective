/**
 * Safe git command runner + structured `git log` parser.
 *
 * All git calls go through here. We use `execFile` with an argument array (no
 * shell), so repo paths and user-supplied filters can never be interpreted as
 * shell syntax. This is the security boundary for the whole server.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Field/record separators chosen to never collide with commit text. */
const FIELD_SEP = "\x1f"; // unit separator
const RECORD_SEP = "\x1e"; // record separator

/** Max bytes of git output we accept before bailing (protects memory). */
const MAX_BUFFER = 64 * 1024 * 1024;

export interface CommitMeta {
  hash: string;
  author: string;
  email: string;
  date: string; // ISO 8601
  subject: string;
}

export interface FileChange {
  path: string;
  added: number; // -1 for binary
  deleted: number; // -1 for binary
}

export interface Commit extends CommitMeta {
  files: FileChange[];
}

/**
 * Run a git subcommand inside `repoPath` and return stdout.
 * Throws a clean, model-readable error if git fails or isn't a repo.
 */
export async function runGit(repoPath: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", repoPath, ...args], {
      maxBuffer: MAX_BUFFER,
      windowsHide: true,
    });
    return stdout;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Git writes the useful part to stderr, which execFile folds into message.
    throw new Error(message.trim());
  }
}

/**
 * Resolve and validate a repository path. Falls back to the GIT_DETECTIVE_REPO
 * env var, then the process working directory. Confirms it is a git work tree.
 */
export async function resolveRepo(repoPath?: string): Promise<string> {
  const candidate = repoPath || process.env.GIT_DETECTIVE_REPO || process.cwd();
  const out = await runGit(candidate, ["rev-parse", "--is-inside-work-tree"]).catch(
    () => ""
  );
  if (out.trim() !== "true") {
    throw new Error(
      `Not a git repository: "${candidate}". Pass repo_path, or set GIT_DETECTIVE_REPO, ` +
        `or start the server inside a git repo.`
    );
  }
  return candidate;
}

const LOG_FORMAT =
  RECORD_SEP +
  ["%H", "%an", "%ae", "%aI", "%s"].join(FIELD_SEP);

/**
 * Run `git log` with numstat and parse it into structured commits.
 * `extraArgs` lets callers add filters like --since, --author, -- <path>.
 */
export async function logCommits(
  repoPath: string,
  extraArgs: string[]
): Promise<Commit[]> {
  const raw = await runGit(repoPath, [
    "log",
    "--no-color",
    `--format=${LOG_FORMAT}`,
    "--numstat",
    ...extraArgs,
  ]);
  return parseLog(raw);
}

/** Parse the delimited `git log --numstat` output into commits. */
export function parseLog(raw: string): Commit[] {
  const commits: Commit[] = [];
  // Each record starts with RECORD_SEP. Drop the empty first chunk.
  const chunks = raw.split(RECORD_SEP).slice(1);

  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    const header = lines[0] ?? "";
    const [hash, author, email, date, subject] = header.split(FIELD_SEP);
    if (!hash) continue;

    const files: FileChange[] = [];
    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      const file = parseNumstatLine(line);
      if (file) files.push(file);
    }

    commits.push({
      hash,
      author: author ?? "",
      email: email ?? "",
      date: date ?? "",
      subject: subject ?? "",
      files,
    });
  }
  return commits;
}

/**
 * Parse one numstat line: "<added>\t<deleted>\t<path>".
 * Binary files use "-". Renames render as "old => new" or "a/{b => c}/d".
 */
export function parseNumstatLine(line: string): FileChange | null {
  const parts = line.split("\t");
  if (parts.length < 3) return null;
  const [addedRaw, deletedRaw, ...rest] = parts;
  const path = normalizeRenamePath(rest.join("\t"));
  return {
    path,
    added: addedRaw === "-" ? -1 : parseInt(addedRaw, 10) || 0,
    deleted: deletedRaw === "-" ? -1 : parseInt(deletedRaw, 10) || 0,
  };
}

/** Collapse git's rename syntax to the current (new) path. */
export function normalizeRenamePath(path: string): string {
  // Brace form: src/{old => new}/file.ts  ->  src/new/file.ts
  const brace = path.replace(/\{[^}]*? => ([^}]*?)\}/g, "$1").replace(/\/\//g, "/");
  if (brace !== path) return brace;
  // Plain form: old/path => new/path  ->  new/path
  const arrow = path.split(" => ");
  return arrow.length === 2 ? arrow[1] : path;
}
