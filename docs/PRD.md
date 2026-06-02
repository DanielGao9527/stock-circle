# Product Requirements Document (PRD) - StockCircle

## 1. Overview

StockCircle is a private web application for a small friend group (fewer than 10 users) to archive and discuss stock-related information in a structured way.

Primary UI language is Chinese, with domain terms such as:

- 持仓快照 (portfolio snapshot)
- 股票笔记 (stock note)
- 外部链接 (external reference link)
- 评论 (comment)

## 2. Product Goals

- Build a trusted and lightweight archive for investment-related discussion.
- Preserve historical snapshots and notes for later reflection.
- Keep data structured and searchable.
- Support simple sharing among trusted friends only.

## 3. Non-Goals and Hard Boundaries

StockCircle must **not** become:

- A brokerage product
- A trade execution system
- A public social media platform
- A brokerage API integration tool
- A precise performance/return analytics tool
- An AI investment recommendation tool

## 4. Target Users

- Small, private group of fewer than 10 invited friends
- Users interested in recording observations and portfolio states
- Users comfortable with simple manual data entry/import

## 5. Core Use Cases

1. Record portfolio snapshot (manual positions, value, date, notes)
2. Create stock notes and tag them for later retrieval
3. Attach external links (news, filings, research, forum posts)
4. Comment on notes/snapshots for asynchronous discussion
5. Review historical records by date, ticker, or tag
6. Import historical data from JSON files (validated format)

## 6. Functional Requirements (MVP)

### 6.1 Auth and Access

- Email/password sign-in via Supabase Auth
- Invite-only access list (managed manually in early stage)
- Only authenticated users can read/write data

### 6.2 Portfolio Snapshots (持仓快照)

- Create snapshot with date/time, owner, and optional portfolio label
- Store line items (ticker, quantity, cost basis optional, market price optional, note)
- Support manual tags and free-text notes
- Allow edit and soft delete

### 6.3 Stock Notes (股票笔记)

- Create note with title, body, ticker(s), tags, and visibility within group
- Rich text is optional in MVP; markdown/plain text is enough
- Link notes to snapshots and external references

### 6.4 External Links (外部链接)

- Save URL with title, source, publish date (optional), summary (optional)
- Associate links with ticker(s), notes, and snapshots

### 6.5 Comments (评论)

- Threaded comments are optional; flat comments are acceptable for MVP
- Comments can attach to note or snapshot
- Edited/deleted state should be tracked minimally

### 6.6 Search and Filtering

- Filter by ticker, tag, author, date range
- Keyword search across note title/body and link title/summary

### 6.7 JSON Import

- Import snapshots/notes/links/comments from local JSON files
- Validate schema strictly before writing to database
- Provide row-level error feedback for invalid records

## 7. Non-Functional Requirements

- Privacy-first: private app, no public indexing
- Availability target: suitable for casual personal usage
- Performance target: typical pages load within 2-3 seconds for small dataset
- Data integrity: preserve created_at/updated_at and immutable IDs
- Simplicity: optimize for maintainability over complex features

## 8. Security and Compliance (Practical Scope)

- Enforce row-level access control (RLS) in Supabase
- Use secure session handling from Supabase Auth
- Avoid storing secrets in client code
- Keep audit-friendly metadata (`created_by`, timestamps)
- No financial advisory or broker-dealer claims in product copy

## 9. Success Metrics (Early Stage)

- All invited users can sign in and create records
- Users can retrieve past records quickly by ticker/date/tag
- JSON import succeeds for agreed schema with clear validation errors
- Product remains within defined non-goal boundaries

## 10. Risks and Mitigations

- Scope creep into trading/analytics -> maintain explicit non-goals in docs/UI
- Data model drift -> lock schema docs before implementation
- Small-team operational risk -> keep deployment and workflows simple

## 11. Release Definition (MVP)

MVP is considered ready when:

- Auth + core CRUD for snapshots/notes/links/comments is stable
- Basic search/filter works
- JSON import works with documented schema
- Deployed on Vercel with Supabase production project
- PWA installable baseline is enabled
