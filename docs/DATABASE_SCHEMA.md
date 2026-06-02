# Database Schema - StockCircle (Supabase Postgres)

## 1. Design Principles

- Keep schema simple and explicit for a very small private group.
- Prioritize auditability (`created_at`, `updated_at`, `created_by`).
- Support archival relationships across snapshots, notes, links, and comments.
- Avoid finance-heavy models intended for trading or precise performance analytics.

## 2. Entity Overview

Core entities:

- `profiles`
- `stocks`
- `posts`
- `post_stocks`
- `portfolio_snapshots`
- `portfolio_items`
- `snapshot_items`
- `stock_notes`
- `external_links`
- `comments`
- `tags`
- `entity_tags` (polymorphic binding)
- `entity_links` (polymorphic binding)

## 3. Table Definitions (Initial)

### 3.1 profiles

Purpose: application profile data mapped to Supabase Auth user.

Key columns:

- `id uuid pk` (references `auth.users.id`)
- `display_name text not null`
- `avatar_url text null`
- `is_active boolean default true`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### 3.2 Quick Post MVP Tables

These tables support the first real feature: quick posting of ideas, links, news, reviews, and notes.

#### stocks

Purpose: reusable stock identity rows keyed by symbol and market.

Key columns:

- `id uuid pk`
- `symbol text not null`
- `market text not null default 'US'`
- `name text null`
- `created_at timestamptz default now()`

Constraints:

- unique `(symbol, market)`

#### posts

Purpose: user-created archive entries from the quick post form.

Key columns:

- `id uuid pk`
- `author_id uuid not null` -> `auth.users.id`
- `title text null`
- `content text not null`
- `post_type text not null` (`idea` | `link` | `news` | `review` | `other`)
- `source_url text null`
- `market text not null default 'US'`
- `reference_price numeric(20,6) null`
- `reference_currency text not null default 'USD'`
- `status text default 'published'`
- `visibility text default 'group'`
- `deleted_at timestamptz null`
- `is_deleted boolean default false`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Soft delete behavior:

- Delete actions set `deleted_at = now()` and `status = 'hidden'`.
- Normal post queries should filter `deleted_at is null` and `status <> 'hidden'`.
- `is_deleted` remains for backward compatibility with early migrations.

#### post_stocks

Purpose: many-to-many relation between posts and associated stocks.

Key columns:

- `post_id uuid not null` -> `posts.id`
- `stock_id uuid not null` -> `stocks.id`
- `created_at timestamptz default now()`

Primary key:

- `(post_id, stock_id)`

### 3.3 portfolio_snapshots

Purpose: top-level snapshot record (持仓快照).

Key columns:

- `id uuid pk`
- `owner_id uuid not null` (user who owns the snapshot)
- `snapshot_date date not null`
- `title text null`
- `notes text null`
- `created_by uuid not null`
- `status text default 'published'`
- `deleted_at timestamptz null`
- `is_deleted boolean default false`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Soft delete behavior:

- Delete actions set `deleted_at = now()` and `status = 'hidden'`.
- Normal snapshot queries should filter `deleted_at is null` and `status <> 'hidden'`.
- `is_deleted` remains for backward compatibility with early migrations.

Indexes:

- `(owner_id, snapshot_date desc)`
- `created_at desc`

### 3.4 snapshot_items

Purpose: legacy/simple line items inside a snapshot. New portfolio snapshot features should use `portfolio_items`.

Key columns:

- `id uuid pk`
- `snapshot_id uuid not null` -> `portfolio_snapshots.id`
- `ticker text not null`
- `market text default 'US'`
- `quantity numeric(20,6) not null`
- `avg_cost numeric(20,6) null`
- `ref_price numeric(20,6) null`
- `currency text default 'CNY'`
- `item_note text null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### 3.5 portfolio_items

Purpose: current portfolio snapshot line items used by the portfolio feature.

Key columns:

- `id uuid pk`
- `snapshot_id uuid not null` -> `portfolio_snapshots.id`
- `stock_id uuid not null` -> `stocks.id`
- `symbol text not null`
- `market text default 'US'`
- `asset_type text not null default 'stock'`
- `underlying_symbol text null`
- `option_type text null`
- `strike_price numeric(20,6) null`
- `expiration_date date null`
- `previous_percent numeric(8,4) null`
- `position_percent numeric(8,4) not null`
- `action_type text null`
- `change_reason text null`
- `cost_price numeric(20,6) null`
- `reference_price numeric(20,6) null`
- `currency text default 'USD'`
- `note text null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Constraints:

- `position_percent >= 0`
- `previous_percent is null or previous_percent >= 0`
- `cost_price is null or cost_price >= 0`
- `reference_price is null or reference_price >= 0`

Position change behavior:

- `previous_percent` is the before-change position.
- `position_percent` is the after-change/current position.
- If `action_type` is empty, the application infers `new`, `increase`, `reduce`, `hold`, or `clear`.

Option-holding behavior:

- `asset_type` is either `stock` or `option`.
- For `option`, the current implementation treats `symbol` as the underlying symbol.
- For `option`, `option_type`, `strike_price`, and `expiration_date` should all be present.

Indexes:

- `(snapshot_id)`
- `(symbol, market)`
- `(stock_id)`

### 3.6 stock_notes

Purpose: investment discussion notes (股票笔记).

Key columns:

- `id uuid pk`
- `author_id uuid not null`
- `title text not null`
- `content text not null`
- `primary_ticker text null`
- `visibility text default 'group'` (future-proof)
- `is_deleted boolean default false`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Indexes:

- `(author_id, created_at desc)`
- `(primary_ticker)`

### 3.7 external_links

Purpose: external references linked to discussion.

Key columns:

- `id uuid pk`
- `submitted_by uuid not null`
- `url text not null`
- `title text not null`
- `source text null`
- `summary text null`
- `published_at timestamptz null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Constraints:

- URL format validation at application layer (strict)

Indexes:

- `created_at desc`
- `(source)`

### 3.8 comments

Purpose: comments on snapshots or notes.

Key columns:

- `id uuid pk`
- `author_id uuid not null`
- `target_type text not null` (`snapshot` | `note`)
- `target_id uuid not null`
- `content text not null`
- `is_deleted boolean default false`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Indexes:

- `(target_type, target_id, created_at asc)`
- `(author_id, created_at desc)`

### 3.9 tags

Purpose: reusable tag dictionary.

Key columns:

- `id uuid pk`
- `name text unique not null`
- `created_at timestamptz default now()`

### 3.10 entity_tags

Purpose: many-to-many tag binding for polymorphic entities.

Key columns:

- `id uuid pk`
- `entity_type text not null` (`snapshot` | `note` | `link`)
- `entity_id uuid not null`
- `tag_id uuid not null` -> `tags.id`
- `created_at timestamptz default now()`

Unique constraint:

- `(entity_type, entity_id, tag_id)`

### 3.11 entity_links

Purpose: bind external links to snapshots/notes.

Key columns:

- `id uuid pk`
- `entity_type text not null` (`snapshot` | `note`)
- `entity_id uuid not null`
- `external_link_id uuid not null` -> `external_links.id`
- `created_at timestamptz default now()`

Unique constraint:

- `(entity_type, entity_id, external_link_id)`

## 4. Relationship Notes

- One `portfolio_snapshots` record has many `snapshot_items`.
- `stock_notes` can reference snapshots via future join table (optional in MVP).
- `comments` use polymorphic target fields for simplicity.
- `tags` and `external_links` are connected via generic mapping tables.

## 5. RLS Strategy (Required)

All tables should enable RLS.

Initial policy model:

- Read: authenticated users in private app can read non-deleted records.
- Write: authenticated users can create records as themselves.
- Update/Delete: only record author/owner can update/delete their own records (or soft delete).

Implementation note:

- Keep policy SQL explicit and table-local; avoid overly generic security functions early on.

## 6. Migration and Naming Conventions

- Use snake_case for table and column names.
- Include created/updated timestamp columns by default.
- Prefer UUID primary keys generated in DB (`gen_random_uuid()`).
- Use soft delete for user-generated content.

## 7. Future Extensions (Not in Initial Migration)

- Snapshot-to-note relation table
- Comment threading (`parent_comment_id`)
- Event log/audit table for import operations
