# 0001. Harness Policy

Status: Accepted
Date: 2026-07-07

## Context

Coding agents are most reliable when quality rules are executable. Prompt instructions and current-state docs can drift, while tests, linters, type checks, and CI fail when the repository violates them.

## Decision

The source of truth for harness behavior is executable infrastructure:

- package scripts and CI define required verification.
- tests pin expected harness wiring and release-critical configuration.
- Biome and custom rules enforce architecture boundaries.
- protected-file guard blocks unapproved edits to harness configuration.

Docs may explain the system, but they are advisory. When docs and executable checks disagree, fix the executable check or update the docs to match it.

## Consequences

- New harness expectations should be represented as tests or deterministic tool rules when practical.
- `pnpm run mvh:verify` is the standard local and CI verification gate.
- Harness configuration changes require explicit approval and `MVH_ALLOW_PROTECTED_CONFIG_CHANGE=1` during final verification.
