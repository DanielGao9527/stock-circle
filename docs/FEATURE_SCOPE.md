# Feature Scope - StockCircle

## Scope Philosophy

StockCircle prioritizes practical archival workflows over complex finance functionality.

Decision rule:

- If a feature helps record/review discussions and references, it is likely in scope.
- If a feature looks like brokerage, trading, public social networking, or investment advice, it is out of scope.

## In Scope (MVP)

### 1) Authentication and Basic Access

- Email/password auth with Supabase
- Private access for invited users only
- Minimal profile (`display_name`, optional avatar)

### 2) Portfolio Snapshots (持仓快照)

- Snapshot creation with date and optional note
- Snapshot items with ticker and quantity
- Optional numeric fields for contextual reference (not performance analytics)
- Position change fields for review workflows, including previous allocation, action type, change reason, and price context
- Edit and soft delete
- Authenticated circle-wide visibility for each member's latest portfolio snapshot
- Operation-flow export in Markdown / JSON / CSV / Plain Text for external AI-assisted review

### 3) Stock Notes (股票笔记)

- CRUD for notes
- Ticker and tag associations
- Optional relation to one or more snapshots

### 4) External Links (外部链接)

- Save URL + title + optional summary/source
- Link to tickers/notes/snapshots

### 5) Comments (评论)

- Add/edit/delete comments on notes and snapshots
- Basic chronological display

### 6) Search and Filters

- Filter by ticker, tag, date, author
- Keyword search in notes and links

### 7) JSON Import

- Import supported entities from strict JSON payloads
- Dry-run validation mode before commit
- Per-record error reporting
- Copyable JSON template for faster external-tool-assisted drafting

### 8) PWA Baseline

- Installable web app
- Basic offline shell behavior (static assets)

## Explicitly Out of Scope (MVP and Near-Term)

- Broker account connection (API/OAuth/import from broker)
- Trading or order execution
- Real-time market data engine
- Exact PnL/IRR/time-weighted return computation
- AI stock recommendation or buy/sell suggestions
- Built-in AI portfolio analysis or automated advisory output
- Public profiles, public feed, open community discovery
- Ads, monetization, referral system

## Conditional Scope (Post-MVP Candidates)

These may be considered later if they remain aligned with product positioning:

- Better timeline views for historical review
- Enhanced tagging taxonomy
- Rich text editor for notes
- Lightweight notification system
- CSV import/export utilities

## De-Scoping Triggers

A feature should be rejected or deferred when:

- It requires brokerage credentials or account synchronization
- It implies trade intent/action workflows
- It introduces compliance-heavy advisory claims
- It adds complexity disproportionate to fewer-than-10-user target

## Scope Change Process

1. Propose feature with user story and expected value.
2. Check against non-goals list in `docs/PRD.md`.
3. Estimate implementation and maintenance cost.
4. Approve only if archival mission is strengthened.
