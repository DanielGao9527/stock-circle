# Contributing Guide - StockCircle

## 1. Purpose

This document defines practical collaboration rules for building StockCircle safely and consistently.

Project context:

- Private app for fewer than 10 trusted users
- Chinese product UI (`zh-CN`)
- Documentation and code comments in English

## 2. Working Principles

- Keep implementation aligned with archival mission.
- Do not introduce brokerage/trading/advice functionality.
- Prefer simple, maintainable solutions over complex abstractions.
- Keep security and privacy as default behavior.

## 3. Branching and PR Workflow

- Main branch: `main`
- Feature branch naming:
  - `feat/<short-topic>`
  - `fix/<short-topic>`
  - `docs/<short-topic>`

PR expectations:

- Small and focused changes
- Clear description of intent and impact
- Screenshots for UI changes when relevant
- Link affected documentation sections

## 4. Commit Message Convention

Use concise, imperative style:

- `feat: add snapshot create form`
- `fix: enforce note ownership in update policy`
- `docs: clarify json import validation errors`

## 5. Coding Standards (When Code Starts)

- Language: TypeScript
- Framework: Next.js App Router
- Styling: Tailwind CSS

Baseline standards:

- Avoid `any` unless justified and documented
- Validate all external input at boundaries
- Keep modules focused and composable
- Add meaningful English comments for non-obvious logic

## 6. Database and Security Rules

- All schema changes must be migration-based
- Enable and test RLS for every user-facing table
- Never expose service role keys in client code
- Preserve audit metadata on write operations

## 7. Documentation Requirements

Whenever behavior or schema changes, update relevant docs:

- `docs/PRD.md`
- `docs/FEATURE_SCOPE.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/JSON_IMPORT_SPEC.md`
- `docs/DEVELOPMENT_PLAN.md`

PRs that change behavior without doc updates should be revised before merge.

## 8. Dependency Policy

- Add dependencies only when necessary.
- Prefer mature, well-maintained packages.
- Document why a new dependency is needed in PR description.
- Remove unused dependencies promptly.

## 9. Pre-Merge Checklist

- Build passes
- Lint passes
- Type checks pass
- Relevant tests pass
- Docs updated
- No scope drift against product non-goals

## 10. Communication Notes

- Keep issue/PR discussion concrete and implementation-oriented.
- Call out assumptions early.
- If a proposal risks product positioning drift, pause and align before coding.
