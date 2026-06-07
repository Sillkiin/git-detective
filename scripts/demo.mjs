#!/usr/bin/env node
/**
 * Narrated demo of git-detective's analysis, runnable against any repo:
 *
 *   npm run build
 *   node scripts/demo.mjs /path/to/some/repo
 *
 * Prints a colorized walkthrough — ideal for recording a GIF with asciinema:
 *   asciinema rec -c "node scripts/demo.mjs /path/to/repo" demo.cast
 */
import {
  repoOverview,
  hotspots,
  coupling,
  ownership,
  recentActivity,
} from "../dist/src/queries.js";

const repo = process.argv[2] || process.env.GIT_DETECTIVE_REPO || process.cwd();

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  magenta: (s) => `\x1b[35m${s}\x1b[0m`,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function header(emoji, title) {
  console.log("\n" + c.bold(c.magenta(`${emoji}  ${title}`)));
  console.log(c.dim("─".repeat(60)));
}

async function main() {
  console.log(c.bold(c.cyan("\n🕵️  git-detective")) + c.dim("  —  analyzing ") + c.cyan(repo));

  header("📊", "repo_overview");
  const ov = await repoOverview(repo);
  console.log(
    `${c.bold(String(ov.totalCommits))} commits · ${c.bold(String(ov.trackedFiles))} files · ` +
      `${c.bold(String(ov.contributors))} contributors · ${ov.ageDays} days old · branch ${c.green(ov.branch)}`
  );
  console.log(
    c.dim("languages: ") +
      ov.languages
        .slice(0, 4)
        .map((l) => `${l.language} ${c.dim(l.share + "%")}`)
        .join("  ")
  );
  await sleep(400);

  header("🔥", "hotspots  — where bugs and complexity concentrate");
  const spots = await hotspots(repo, undefined, 5);
  for (const s of spots) {
    const risk = s.authors === 1 ? c.red(" ⚠ bus-factor 1") : "";
    console.log(
      `  ${c.yellow(String(s.commits).padStart(3))} commits  ${c.bold(s.path)}` +
        c.dim(`  (${s.authors} author${s.authors === 1 ? "" : "s"}, ${s.linesChanged} lines)`) +
        risk
    );
  }
  await sleep(400);

  header("🔗", "change_coupling  — files that secretly change together");
  const pairs = await coupling(repo, undefined, 5, 2);
  if (pairs.length === 0) {
    console.log(c.dim("  (not enough shared history yet)"));
  }
  for (const p of pairs) {
    console.log(
      `  ${c.green(p.confidence + "%")} of the time  ${c.bold(p.a)} ${c.dim("↔")} ${c.bold(p.b)}` +
        c.dim(`  (${p.shared} shared commits)`)
    );
  }
  await sleep(400);

  header("👤", "ownership  — who knows this code, and the bus-factor");
  const own = await ownership(repo, undefined);
  console.log(
    `  bus-factor ${c.bold(c.red(String(own.busFactor)))} · ${own.contributors} contributors`
  );
  for (const a of own.authors.slice(0, 5)) {
    console.log(`  ${c.green(String(a.share).padStart(5) + "%")}  ${a.author}` + c.dim(`  (${a.commits} commits)`));
  }
  await sleep(400);

  header("🗓️", 'recent_activity  — "what happened lately?"');
  const act = await recentActivity(repo, "30 days ago", 200);
  console.log(`  ${c.bold(String(act.commits))} commits in the last 30 days, ${act.filesTouched} files touched`);
  for (const cm of act.recentCommits.slice(0, 4)) {
    console.log(c.dim(`  ${cm.date.slice(0, 10)} `) + cm.subject + c.dim(`  — ${cm.author}`));
  }

  console.log(
    c.dim("\nAll of this lands as structured JSON inside your AI agent — ask it to ") +
      c.cyan("explain, plan a refactor, or write the standup.") +
      "\n"
  );
}

main().catch((err) => {
  console.error(c.red("demo failed: ") + err.message);
  process.exit(1);
});
