---
name: pr-review
description: Classify PR risk and recommend approval or changes for a pull request or PR diff. Excludes implementation and merge execution.
---

# PR Review

Apply the repository's `AGENTS.md` for architecture, protected files, and verification. This skill produces a review recommendation; publishing reviews or labels and merging require explicit user authorization.

## Size classification

Assess impact and risk, using these labels:

| Label     | Scope and risk                                       |
| --------- | ---------------------------------------------------- |
| `size/XS` | Localized documentation, skills, or low-risk config. |
| `size/S`  | Single component or utility, tests, or minor UI fix. |
| `size/M`  | One feature or multi-file change with clear scope.   |
| `size/L`  | Cross-feature, schema, or shared state changes.      |
| `size/XL` | System-wide architecture, security, or migration.    |

- `size/XS` is limited to documentation (`*.md`, `docs/`), skills (`.agents/`), or explicitly approved low-risk config (`.coderabbit.yaml`, `.gitignore`, `.gitattributes`, `.editorconfig`). Workflow, build, production code, and schema changes are excluded.
- Notification, SQLite schema, Widget synchronization, and core data model changes are at least `size/M`; use `size/L` for broad impact.
- For the automated label calculation, consult `.github/workflows/pr-size-and-automerge.yml`; its path and diff thresholds are the executable source of truth.

## Code Review & Approval Criteria

Report actionable regressions with their trigger, impact, and affected location. Check relevant tests and the project's UI/application/adapter boundaries, especially notification and Widget consistency after reminder mutations.

Recommend `APPROVE` when no blocking bug, security issue, or architecture violation remains. Recommend `REQUEST_CHANGES` for blocking findings; keep optional suggestions separate. State verification gaps that affect confidence in the decision.
