---
name: rtk
description: >-
  Use this skill to optimize CLI and terminal output token consumption.
  Enforces noise reduction, compact flags (git status -s, git diff --stat, npm --depth=0),
  and output truncation/summarization, reducing terminal token usage by 60-90%.
---

# RTK: Rust Token Killer (CLI Output Optimization)

RTK is designed to prevent runaway token costs caused by noisy terminal outputs (build logs, test outputs, package lists, git histories).

## When to Activate
- When executing terminal or shell commands that generate verbose output.
- When running tests, builds, package manager queries, or container inspections.
- When configuring or installing the `rtk` proxy binary on the machine.

## Optimization Strategies

### 1. Git Operations
- Status: `git status -s` (saves ~80% tokens vs standard git status).
- History: `git log --oneline -n <N>` (compact format).
- Diffs: Check `git diff --stat` or specify filenames directly.

### 2. Package Managers & Builds
- Node/NPM: `npm list --depth=0`, `npm test -- --silent` or pipe through grep.
- Rust/Cargo: `cargo check --quiet`, `cargo test -- --quiet`.
- Python: `pytest -q --tb=short`.

### 3. File Search & Inspection
- Never dump entire directories or huge files to stdout.
- Use targeted ripgrep: `rg --max-count 5 "pattern"` or head/tail constraints.

## Installing the `rtk` CLI Binary (Optional Native Hook)
If the user wants native automatic interception of all shell tool calls:
- Install via Cargo: `cargo install rtk`
- Or download the prebuilt binary from the RTK GitHub releases.
- Run `rtk init -g` to register global hooks across installed coding assistants.
