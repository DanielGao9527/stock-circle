# Development Plan - StockCircle

## 1. Objective

Deliver a private, stable MVP for fewer than 10 users with clear archival workflows:

- 持仓快照 (portfolio snapshots)
- 股票笔记 (stock notes)
- 外部链接 (external links)
- 评论 (comments)

## 2. Delivery Principles

- Build smallest useful product first
- Keep privacy and access control strict
- Avoid features that drift toward brokerage/trading/advice
- Ship iteratively with validation at each phase

## 3. Phase Plan

### Phase 0 - Foundation and Project Setup

Goals:

- Initialize Next.js App Router + TypeScript + Tailwind
- Configure Supabase project and environment variables
- Set up deployment pipeline on Vercel
- Define lint/format/test baseline

Deliverables:

- Running skeleton app
- CI checks for build/lint/typecheck
- Environment setup guide

### Phase 1 - Auth and Access Control

Goals:

- Implement sign in/sign out with Supabase Auth
- Restrict app routes to authenticated users
- Add profile bootstrap on first sign-in

Deliverables:

- Working auth flow
- Protected pages
- Basic `profiles` table integration

### Phase 2 - Core Data Layer

Goals:

- Implement DB schema from `docs/DATABASE_SCHEMA.md`
- Add migrations and RLS policies
- Create typed data access boundaries

Deliverables:

- Applied migrations
- RLS tested for read/write/update/delete constraints
- Basic repository/service structure

### Phase 3 - Core Features (CRUD)

Goals:

- Implement snapshots and snapshot items
- Implement notes
- Implement external links
- Implement comments on notes/snapshots

Deliverables:

- End-to-end CRUD for all core entities
- Basic UI in Chinese
- Soft delete behavior

### Phase 4 - Search, Filtering, and Linking

Goals:

- Add search/filter by ticker/tag/date/author
- Support linking notes to snapshots and links
- Improve list/detail navigation
- Add authenticated public portfolio pages for latest holdings, history, and recent position changes

Deliverables:

- Functional query/filter experience
- Basic relation management UX
- Shared portfolio visibility inside the private circle

### Phase 5 - JSON Import

Goals:

- Implement JSON parser and validator per `docs/JSON_IMPORT_SPEC.md`
- Add dry-run mode and error reporting
- Add transactional import execution
- Improve import usability with a copyable JSON template

Deliverables:

- Import page/workflow
- Validation and import result report
- Audit-friendly import summary logs
- Template-assisted JSON creation flow for external tools

### Phase 5.5 - Portfolio Review Export

Goals:

- Add operation-flow export for the current user's portfolio snapshots
- Support date-range filtering and clear structured output
- Prepare copy-ready exports for external AI tools without integrating any AI API

Deliverables:

- `/portfolio/export` page
- Markdown / JSON / CSV / Plain Text export formats
- Copy-ready operation flow for retrospective analysis

### Phase 6 - PWA and Stabilization

Goals:

- Add installable PWA baseline
- Improve loading/error states
- Perform end-to-end sanity testing

Deliverables:

- Installable app shell
- Stability fixes and documentation updates
- MVP release checklist completion

## Daily Email Digest

- Daily email digest is implemented with Resend.
- Delivery is triggered by Vercel Cron.
- The schedule targets roughly 10 minutes before the US market open.
- The digest contains circle activity summaries only.
- No AI analysis is included in this email.

## 4. Suggested Timeline (Small Team)

- Phase 0-1: 1 week
- Phase 2-3: 1-2 weeks
- Phase 4-5.5: 1-1.5 weeks
- Phase 6: 3-5 days

Total estimated MVP: ~4 weeks (part-time pace).

## 5. Testing Strategy

- Unit tests for validation and utility logic
- Integration tests for data access and RLS-sensitive operations
- Smoke tests for major user flows:
  - login
  - create/edit snapshot
  - view authenticated public portfolios
  - create note + comment
  - import JSON with dry-run and commit
  - export portfolio operation flow across date ranges

## 6. Risks and Controls

- RLS misconfiguration -> add policy-specific test cases
- Scope creep -> enforce `docs/FEATURE_SCOPE.md`
- Data quality issues on import -> strict validation and clear errors
- Export formatting drift -> keep one canonical export builder for all formats
- Overengineering for tiny user base -> keep implementation minimal

## 7. MVP Exit Criteria

MVP can be considered done when:

- Private auth and protected access are stable
- Core archival entities are fully usable
- Search/filter is practical for daily use
- JSON import works reliably with documented contract
- Portfolio export works reliably with clear copyable output
- PWA installability is verified
