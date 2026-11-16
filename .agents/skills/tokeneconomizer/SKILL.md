---
name: tokeneconomizer
description: >-
  Use this skill when inspecting or controlling Microsoft TokenEconomizer: checking repository cost reduction,
  viewing learned micro-skills and facts, auditing tool prune status, or configuring failure loop guards.
---

# Microsoft TokenEconomizer Skill

TokenEconomizer is an experience-driven cost controller developed by Microsoft Research and UC Berkeley. It reduces token consumption across repetitive tasks in the same repository by learning environment micro-skills, pruning unused tools, and intervening in stuck failure loops.

## Commands

Run the CLI launcher from terminal or via `run_command`:

```powershell
python "$env:USERPROFILE\.gemini\config\plugins\tokeneconomizer\scripts\te_bootstrap.py" cli --host antigravity status
```

### 1. Check Status and Token Savings
```powershell
python "$env:USERPROFILE\.gemini\config\plugins\tokeneconomizer\scripts\te_bootstrap.py" cli --host antigravity status
```
Displays:
- Folded sessions and effective token savings
- Injected micro-skills and repository facts
- Tool prune status
- Loop guard intervention statistics

### 2. View Learned Micro-Skills & Environment Facts
```powershell
python "$env:USERPROFILE\.gemini\config\plugins\tokeneconomizer\scripts\te_bootstrap.py" cli --host antigravity microskills
```

### 3. Run Doctor Diagnostics
```powershell
python "$env:USERPROFILE\.gemini\config\plugins\tokeneconomizer\scripts\te_bootstrap.py" cli --host antigravity doctor
```

### 4. Configuration
Toggle features on or off per repository or globally:
```powershell
# Enable micro-skills learning
python "$env:USERPROFILE\.gemini\config\plugins\tokeneconomizer\scripts\te_bootstrap.py" cli --host antigravity config set microskills=envfacts

# View all configuration settings
python "$env:USERPROFILE\.gemini\config\plugins\tokeneconomizer\scripts\te_bootstrap.py" cli --host antigravity config show
```
