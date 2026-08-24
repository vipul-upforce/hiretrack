## Cursor Pagination Migration Plan (Kanban lanes)

### Context / current state

- **Current paging model**: offset/page based (`page`, `limit`) for per-lane “load more”, backed by Mongo `skip = (page - 1) * limit`.
- **Realtime updates**: WS/SSE can move candidates between lanes and update candidate fields while Client B has already loaded page 1 and possibly page 2+.
- **Observed failure modes with offset paging**:
  - **Gaps**: page 1 shrinking from 5 → 4 after SSE move-out shifts the correct page boundary; requesting page 2 with `skip=5` permanently misses 1 candidate.
  - **Overlaps/duplicates**: page 1 expanding (5 → 6) can cause duplication across page boundaries.
  - **Sort/filter flicker**: strict filter evaluation and partial SSE payloads can cause temporary exclusion; offset paging magnifies the issue under mutations.

### Goals

- **Stable infinite scroll under SSE moves** with **no additional API calls triggered by SSE** for connected clients (Client B).
- **Preserve the active sort and filters** stored in localStorage (per-lane and global) so “next page” corresponds to the same order.
- Keep **lane counts** as today:
  - Backend aggregation count as baseline.
  - `laneCountDeltas` (SSE) as realtime adjustment (filter-aware).

### Non-goals

- Perfect “global resort” of already-rendered items on every SSE update. (We’ll preserve correctness and paging stability; UI ordering may still visually adjust when a candidate’s sort key changes.)

---

## Proposed design: Cursor-based pagination per lane

### API contract (per-lane load more)

Replace or augment `page` with cursor parameters.

#### Request (new)

`GET /api/jobs/:jobId/candidates?lanes=:lane&limit=5&sortBy=tracking.createdAt&sortOrder=desc&filter=...&cursor=...`

- **cursor**: opaque string or structured params representing the last item seen.
- **limit**: page size (same as today).
- **sortBy/sortOrder/filter**: same inputs you already send from localStorage.

#### Response (new)

```json
{
  "candidates": [...],
  "pageInfo": {
    "hasNextPage": true,
    "nextCursor": "<opaque>"
  },
  "sorting": { "sortBy": "tracking.createdAt", "sortOrder": "desc" },
  "filters": ["..."],
  "meta": { "jobId": "...", "lane": "applied" }
}
```

### Cursor format

Use a **composite cursor**: **(primarySortValue, \_id)**.

- **Why `_id`**: tie-breaker guarantees deterministic order even when many candidates share the same sort value.
- **Why composite**: single-field cursors break when sortValue duplicates exist.

#### Cursor payload (before encoding)

```ts
type LaneCursor = {
  sortBy: string; // active field (from localStorage)
  sortOrder: 'asc' | 'desc';
  sortValue: string | number; // last candidate’s sort value (normalized)
  id: string; // last candidate _id (string)
};
```

Encode as:

- **Option 1**: base64url(JSON.stringify(cursor)).
- **Option 2**: signed cursor (HMAC) to prevent tampering (recommended if you expose it publicly).

---

## Backend implementation details (Mongo)

### Sorting + cursor query

Always sort by:

1. `{ [sortBy]: sortDir }`
2. `{ _id: sortDir }` (same direction as primary)

For **desc**:

- Fetch “after cursor” by adding:
  - `sortBy < cursor.sortValue` OR (`sortBy == cursor.sortValue` AND `_id < cursor.id`)

For **asc**:

- Use `>` comparisons.

### Type handling per sortBy

Sort values can be:

- **Date/string date**: `tracking.createdAt`, `tracking.updatedAt`, `assignment.assignedAt`
- **Number**: `scores.overall`, `experience`, CTC fields, notice period
- **String**: `name`, `email` (if you allow them)

Rules:

- Normalize `sortValue` in the cursor into the same representation used by Mongo queries.
- Define a consistent policy for **null/missing** values (common for assignment dates and scores).
  - Recommended: treat missing as “last” in desc and “first” in asc (or vice versa), but be explicit.

### Required indexes (performance + scalability)

Cursor pagination without proper indexes will be slow at scale.

At minimum, for each “allowed sortBy” you support in lanes, add a compound index consistent with filters:

- `{ jobId: 1, organizationId: 1, isDeleted: 1, status: 1, <sortBy>: -1, _id: -1 }`

If you use lane ObjectId as status internally, index on that field.

### Backwards compatibility

Implement cursor paging alongside existing page paging:

- If `cursor` is present → cursor mode.
- Else if `page` is present → legacy offset mode.

Then migrate frontend lane infinite scroll to cursor mode behind a feature flag.

---

## Frontend integration plan

### RTK Query endpoint

Add a new query (or extend existing `fetchLaneCandidates`) to accept:

- `cursor?: string`
- Keep `limit`, `filter`, `sortBy`, `sortOrder`

Expected response:

- `pageInfo.nextCursor`
- `pageInfo.hasNextPage`

### KanbanColumn state changes

Per lane:

- Replace `loadedPagesRef`, `currentPage`, `requestedPage` logic with:
  - `nextCursor` (string | null)
  - `hasNextPage` (boolean)
  - `isLoadingMore` (boolean)
  - `seenIds` set (dedupe, still useful with SSE)

Virtuoso `endReached`:

- if `hasNextPage && !isLoadingMore` → trigger fetch with `cursor=nextCursor`.

On response:

- append new candidates (dedupe by `_id`)
- update `nextCursor` and `hasNextPage`

### Sorting + localStorage

Cursor is derived from the current lane’s active sort:

- If per-lane sort exists: use that.
- Else use global sort.
- Cursor payload must include `sortBy/sortOrder` so backend can validate the cursor matches the request (prevents mixed cursors).

### Filtering

Use the same filter object you already pass to the API.

Important:

- Your SSE filter evaluation is strict. If SSE payloads are partial, candidates may still flicker.
- Cursor pagination stabilizes paging, but **does not fix partial SSE payload flicker**. Fix is to include required fields in SSE payload or relax strictness.

---

## SSE/WS interaction (no extra API calls)

### Membership changes (status move)

- **Old lane**: remove candidate by id from lane list.
- **New lane**: insert candidate into lane list.
  - Optional: insert in correct sorted position; otherwise add to top/end and accept minor ordering drift until next scroll fetch.

### Sort-key changes (e.g., updatedAt / score)

- Avoid triggering refetch.
- Optionally “reposition” candidate in the lane list client-side if you want visual correctness; paging remains stable regardless.

### Counts

Keep existing logic:

- backend `count`
- - `laneCountDeltas[lane]` for realtime adjustment (filter-aware)

---

## Rollout steps (safe migration)

### Step 0: Instrumentation

- Add structured logs for:
  - `cursorRequest` (lane, cursor present, limit, sortBy/order)
  - `cursorResponse` (returned count, hasNextPage)
  - `cursorDedupe` (deduped ids count)

### Step 1: Backend dual-mode

- Add cursor mode to the lane pagination path.
- Keep page mode unchanged.

### Step 2: Frontend feature flag

- `useCursorPaginationForLanes` (env flag or localStorage flag).
- Roll out to internal users first.

### Step 3: Remove legacy complexity

After stable:

- Remove page-based lane infinite scroll state machine (loadedPagesRef, page mismatch guards, reset windows).
- Keep only cursor state + dedupe.

---

## Test plan / acceptance criteria

### Functional

- **SSE move-out from old lane**:
  - old lane immediately removes the candidate
  - scrolling continues to load remaining candidates with **no missing 1**
- **SSE move-in to new lane**:
  - new lane shows moved candidate immediately (subject to filter)
  - scrolling loads more without duplicates
- **Sort change**:
  - resets lane list and cursor (cursor invalidated)
  - paging follows new sort deterministically
- **Filter change**:
  - resets cursor and list
  - no “ghost candidates” from SSE that don’t match filter

### Performance

- Cursor queries are index-supported (no collection scans) for top lanes at 100K+ candidates.
- No increase in background API calls on SSE for connected clients.

---

## Open questions (resolve before implementation)

- Which lane sort fields are truly supported in production (string sorts require collation/normalization)?
- Null handling policy per sortBy (especially `assignment.assignedAt`, `scores.overall`).
- Should cursors be signed (recommended) to prevent tampering?
