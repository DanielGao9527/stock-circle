# JSON Import Specification - StockCircle

## 1. Purpose

Define a strict JSON contract for importing archival data into StockCircle.

Import is intended for:

- Backfilling historical records
- Migrating personal notes from previous tools
- Bulk loading snapshots, notes, links, and comments

Import is **not** intended for:

- Broker integration
- Real-time trading data ingestion
- Performance analytics feeds

## 2. General Rules

- Encoding: UTF-8
- File type: `.json`
- Top-level must be an object
- IDs in import payload are client-provided external IDs; system maps them to DB UUIDs
- Unknown fields are rejected in strict mode

## 3. Top-Level Structure

```json
{
  "version": "1.0",
  "exportedAt": "2026-06-02T10:00:00Z",
  "source": "manual-or-tool-name",
  "users": [],
  "snapshots": [],
  "notes": [],
  "links": [],
  "comments": []
}
```

Required keys:

- `version`
- `snapshots`
- `notes`
- `links`
- `comments`

`users` is optional for MVP (can map to current authenticated user).

## 4. Field Specifications

### 4.1 users (optional)

```json
{
  "externalUserId": "u_001",
  "displayName": "Alice"
}
```

### 4.2 snapshots

```json
{
  "externalSnapshotId": "s_001",
  "ownerExternalUserId": "u_001",
  "snapshotDate": "2026-05-31",
  "title": "May End Snapshot",
  "notes": "Monthly archive",
  "tags": ["monthly", "review"],
  "items": [
    {
      "ticker": "0700.HK",
      "quantity": 100,
      "avgCost": 320.5,
      "refPrice": 330.0,
      "currency": "HKD",
      "note": "Long-term watch"
    }
  ]
}
```

Validation:

- `externalSnapshotId`: required, unique in file
- `snapshotDate`: required, `YYYY-MM-DD`
- `items`: required, non-empty array
- `quantity`: required, `>= 0`

### 4.3 notes

```json
{
  "externalNoteId": "n_001",
  "authorExternalUserId": "u_001",
  "title": "Q1 earnings thoughts",
  "content": "Key observations...",
  "primaryTicker": "AAPL",
  "tags": ["earnings", "watchlist"],
  "relatedSnapshotExternalIds": ["s_001"]
}
```

Validation:

- `externalNoteId`, `title`, `content` required
- `relatedSnapshotExternalIds` must reference existing `externalSnapshotId` if provided

### 4.4 links

```json
{
  "externalLinkId": "l_001",
  "submittedByExternalUserId": "u_001",
  "url": "https://example.com/article",
  "title": "Useful article",
  "source": "Example Media",
  "summary": "Short summary",
  "publishedAt": "2026-05-20T08:00:00Z",
  "tags": ["macro"],
  "relatedNoteExternalIds": ["n_001"],
  "relatedSnapshotExternalIds": ["s_001"]
}
```

Validation:

- `externalLinkId`, `url`, `title` required
- URL must be valid `http` or `https`

### 4.5 comments

```json
{
  "externalCommentId": "c_001",
  "authorExternalUserId": "u_001",
  "targetType": "note",
  "targetExternalId": "n_001",
  "content": "Interesting angle.",
  "createdAt": "2026-05-21T09:00:00Z"
}
```

Validation:

- `externalCommentId`, `targetType`, `targetExternalId`, `content` required
- `targetType` must be `note` or `snapshot`

## 5. Import Execution Model

Recommended flow:

1. Parse and validate JSON structure.
2. Perform reference integrity checks.
3. Run dry-run summary (valid count, error count).
4. If confirmed, import in transaction batches.
5. Return per-record result report.

## 6. Error Reporting Contract

Error output should include:

- `entityType`
- `externalId`
- `field`
- `errorCode`
- `message`

Example:

```json
{
  "entityType": "snapshot",
  "externalId": "s_001",
  "field": "snapshotDate",
  "errorCode": "INVALID_DATE",
  "message": "snapshotDate must use YYYY-MM-DD."
}
```

## 7. Versioning

- Initial version: `1.0`
- Backward-incompatible changes require new major version
- Importer should reject unknown major versions

## 8. Security and Safety

- Import endpoint must require authenticated user
- Enforce payload size limit (e.g., 5-10 MB)
- Apply rate limiting to avoid abuse
- Log import summary for auditability
