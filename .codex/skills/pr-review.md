# PR Review Guidelines & Size Classification

This document defines the rules and criteria for automated PR size labeling and code review evaluation when using Codex Action / Codex PR Review.

## 1. PR Size Classification Matrix

Assign size labels (`size/XS` ~ `size/XL`) based on **impact scope** and **risk level** rather than raw diff line count.

| Label     | Criteria                               | Examples                                                                                                                                          |
| --------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `size/XS` | Localized impact, virtually zero risk. | Typo corrections, comment additions/fixes, minor document or non-production config tweaks, patch version dependency bumps with zero code changes. |
| `size/S`  | Narrow scope, low risk.                | Single component/utility fix, test additions/refactoring, minor UI adjustments.                                                                   |
| `size/M`  | Multi-file impact with clear scope.    | Single feature implementation or enhancement, internal component refactoring.                                                                     |
| `size/L`  | Broad impact or key domain changes.    | Multi-feature changes, database schema modifications, shared state contract updates.                                                              |
| `size/XL` | System-wide or critical path changes.  | Core architecture overhaul, authentication/security model changes, major database migrations.                                                     |

### Classification Guidelines

- **Component Scope**: Count how many domain modules or layers are touched.
- **Behavioral Impact**: Check for breaking interface changes, database migrations, or public API modifications.
- **Domain Risk**: Changes affecting notifications, SQLite DB schemas, widget synchronizations, or core data models must be rated at least `size/M` or `size/L`.
- Do **NOT** assign `size/XS` to any change modifying core business logic, SQLite schemas, or native module integration.

---

## 2. Code Review & Approval Criteria

Perform code review according to the following standards:

1. **Code Quality & Consistency**: Follows existing TypeScript, React Native, Expo, and Biome conventions.
2. **Defensive Coding & Bugs**: Avoids unhandled null/undefined values, unhandled async errors, or race conditions.
3. **Performance**: Avoids unnecessary rerenders or unindexed DB queries.
4. **Domain Boundaries**: Complies with layered architecture (UI components should not bypass application services or call SQLite directly).
5. **Testing**: Includes tests for newly introduced logic or bug fixes.

### Approval Condition

- Submit an `APPROVE` review if the PR contains no critical bugs, security vulnerabilities, or architecture boundary violations.
- If there are minor suggestions or questions, include them in the review comment while approving if non-blocking, or request changes if blocking.
