# Changelog

All notable changes to this project are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/), and the project uses [SemVer](https://semver.org/).

## [0.1.0] - 2026-06-07

### Added

- Initial release: a zero-config, read-only MCP server for Git repository analysis.
- Seven tools: `repo_overview`, `recent_activity`, `file_history`, `search_commits`, `hotspots`,
  `change_coupling`, `ownership`.
- Hotspot ranking by change frequency, temporal change-coupling with support/confidence, and
  ownership analysis with a bus-factor metric.
- Safe git execution via `execFile` (no shell), structured `git log --numstat` parsing with rename
  handling, and `repo_path` / `GIT_DETECTIVE_REPO` resolution.
- 14 unit tests over the parser and analysis functions; CI on Node 18/20/22.
