---
name: ponytail
description: >-
  Use this skill to eliminate over-engineering, code bloat, and excessive token usage in codebases.
  Enforces 'The Ladder' decision hierarchy (YAGNI, Reuse, Standard Library, Native Platform, Installed Dependency, One-Line, Minimum Viable)
  to ensure clean, minimal, production-ready code with maximum token efficiency.
---

# Ponytail Skill: Token Saving & Anti-Overengineering

"The best code is the code you never wrote. The second best is the one-liner."

## When to Activate
- When designing or writing new functions, components, or services.
- When refactoring existing code to reduce bloat and cognitive load.
- When reviewing pull requests or diffs for over-engineering (`/ponytail-review`).
- When seeking to reduce token consumption across prompts, instructions, and code diffs.

## The 7-Rung Ladder

Step through this ladder before writing code:

```
[1] YAGNI               -> Can we simply not build this?
  ↓
[2] Reuse               -> Did someone on the team already solve this in this codebase?
  ↓
[3] Standard Library    -> Does the language runtime or stdlib do this out of the box?
  ↓
[4] Native Platform     -> Does HTML5/CSS/DOM/Browser API handle this natively?
  ↓
[5] Installed Package   -> Does an already installed package have this? (No new deps!)
  ↓
[6] One-Liner           -> Can a simple functional expression or utility line do it?
  ↓
[7] Minimum Viable Diff -> Write the absolute smallest, clean diff that passes tests.
```

## Anti-Patterns to Strike Down
1. **Premature Abstractions**: Factory functions for things created once; interfaces with only one implementation; unnecessary wrapper classes.
2. **Heavy Component Libraries for Basic Inputs**: Installing a 200KB dropdown library when `<select>` or `<details>` suffices.
3. **Verbose Boilerplate**: Hundreds of lines of glue code that could be replaced by native functional methods (`map`, `filter`, `reduce`, `find`).
4. **Speculative Future-Proofing**: Code written "in case we need to support X later".

## Code Review Protocol (`/ponytail-review`)
When asked to review code under Ponytail:
1. **Flag Unnecessary Code**: Highlight lines that fail the YAGNI or Standard Library check.
2. **Suggest Native Replacements**: Point to native browser or language APIs.
3. **Provide Compact Diffs**: Show the replacement in minimal lines.
4. **Calculate Bloat Reduction**: State estimated lines removed and token savings.
