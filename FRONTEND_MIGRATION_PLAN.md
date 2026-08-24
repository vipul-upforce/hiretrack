# Frontend Migration Plan

## Migrating to New Candidates API with Lane Filtering & Pagination

---

## 📋 **Overview**

**Current API Response:**

```typescript
Candidate[] // Flat array of all candidates
```

**New API Response:**

```typescript
{
  lanes: {
    [laneName]: {
      candidates: Candidate[]; // First 50 candidates
      count: number;
      hasMore: boolean;
      page: number;
      totalPages: number;
    }
  };
  meta: {
    jobId: string;
    useCustomLanes: boolean;
    availableLanes: string[];
    totalCandidates: number;
  };
}
```

---

## 🎯 **Migration Goals**

1. ✅ Use new grouped-by-lane API response
2. ✅ Remove client-side lane grouping (now done by API)
3. ✅ Keep client-side filtering (search, topCandidates, etc.)
4. ✅ Handle pagination per lane for lazy loading
5. ✅ Merge with SSE updates seamlessly
6. ✅ Maintain backward compatibility during transition

---

## 📁 **Files to Update**

### **1. RTK Query API Definition**

**File:** `src/lib/features/candidate/candidateApi.ts`

**Current:**

```typescript
fetchCandidates: builder.query<Candidate[], string>({
  query: (jobId) =>
    `/jobs/${jobId}/candidates?groupByLane=true&lanePageSize=50`,
  providesTags: ['Candidate'],
});
```

**New:**

```typescript
interface GroupedCandidatesResponse {
  lanes: {
    [laneName: string]: {
      candidates: Candidate[];
      count: number;
      hasMore: boolean;
      page: number;
      totalPages: number;
    };
  };
  meta: {
    jobId: string;
    useCustomLanes: boolean;
    availableLanes: string[];
    totalCandidates: number;
  };
}

fetchCandidates: builder.query<GroupedCandidatesResponse, string>({
  query: (jobId) => `/jobs/${jobId}/candidates`,
  providesTags: ['Candidate'],
});
```

---

### **2. Normalized Candidates Hook**

**File:** `src/app/dashboard/jobs/[id]/hooks/useNormalizedCandidates.ts`

**Current:** Expects `Candidate[]` from API, groups by lane client-side

**New:**

- Accept `GroupedCandidatesResponse` from API
- Extract candidates from lanes object
- Merge with SSE updates
- Return flat array for backward compatibility (or return grouped structure)

**Options:**

- **Option A:** Return flat array (backward compatible, easier migration)
- **Option B:** Return grouped structure (better, but requires more changes)

---

### **3. Job Page Effects Hook**

**File:** `src/app/dashboard/jobs/[id]/hooks/useJobPageEffects.ts`

**Current:**

- Receives flat `Candidate[]`
- Groups by lane client-side (lines 242-255)
- Applies filters

**New:**

- Receive grouped structure from API
- Convert to `CandidateColumn[]` format
- Still apply client-side filters (search, topCandidates, etc.)
- Remove client-side lane grouping logic

---

### **4. Job Progress Page Hook**

**File:** `src/app/dashboard/jobs/[id]/hooks/useJobProgressPage.ts`

**Current:** Uses `useFetchCandidatesQuery` directly

**New:** Use updated `useNormalizedCandidates` hook

---

### **5. Type Definitions**

**File:** `src/types/candidate.ts` or new file

**Add:**

```typescript
export interface GroupedCandidatesResponse {
  lanes: {
    [laneName: string]: {
      candidates: Candidate[];
      count: number;
      hasMore: boolean;
      page: number;
      totalPages: number;
    };
  };
  meta: {
    jobId: string;
    useCustomLanes: boolean;
    availableLanes: string[];
    totalCandidates: number;
  };
}
```

---

## 🔄 **Step-by-Step Migration Plan**

### **Phase 1: Update Type Definitions** ✅

**Step 1.1:** Create new response type

- Add `GroupedCandidatesResponse` interface
- Export from appropriate types file

**Step 1.2:** Update existing types if needed

- Ensure `CandidateColumn` type is compatible

---

### **Phase 2: Update RTK Query** ✅

**Step 2.1:** Update `fetchCandidates` endpoint

- Change return type from `Candidate[]` to `GroupedCandidatesResponse`
- Remove query params (API handles defaults)
- Update `providesTags` if needed

**Step 2.2:** Test API connection

- Verify response structure matches
- Check error handling

---

### **Phase 3: Update useNormalizedCandidates Hook** ✅

**Step 3.1:** Update hook to handle new response

```typescript
// Extract candidates from grouped response
const allCandidates = useMemo(() => {
  if (!candidatesFromQuery) return [];

  // Flatten candidates from all lanes
  return Object.values(candidatesFromQuery.lanes).flatMap(
    (lane) => lane.candidates,
  );
}, [candidatesFromQuery]);
```

**Step 3.2:** Merge with SSE updates

- Keep existing SSE merge logic
- SSE candidates take precedence

**Step 3.3:** Return lane metadata (optional)

```typescript
return {
  candidates: normalizedCandidates,
  laneCounts: candidatesFromQuery?.lanes, // NEW
  isLoading: isCandidatesLoading,
  refetch,
};
```

---

### **Phase 4: Update useJobPageEffects Hook** ✅

**Step 4.1:** Remove client-side lane grouping

- Remove lines 242-255 (grouping logic)
- Use API's grouped structure directly

**Step 4.2:** Convert API response to columns

```typescript
const updatedColumns = lanesArray.map((lane) => {
  const laneData = candidatesFromQuery?.lanes[lane];
  const candidates = laneData?.candidates || [];

  // Apply client-side filters (search, topCandidates, etc.)
  const filteredCandidates = applyFilters(candidates, filterConditions);

  return {
    id: lane as CandidateStatus,
    title: lane,
    candidates: filteredCandidates,
    count: laneData?.count || 0,
    hasMore: laneData?.hasMore || false,
  } as CandidateColumn;
});
```

**Step 4.3:** Keep client-side filtering

- Search filter
- Top candidates filter
- Date filters
- Assignment filters
- Remarks filters

---

### **Phase 5: Handle Pagination Per Lane** ✅

**Step 5.1:** Add lazy loading per lane

```typescript
// New hook for lazy loading per lane
const useLaneCandidates = (jobId: string, laneName: string, page: number) => {
  return useFetchCandidatesQuery({
    jobId,
    lanes: [laneName],
    page,
    limit: 50,
  });
};
```

**Step 5.2:** Update KanbanColumn to load more

- Use `react-virtuoso`'s `endReached` callback
- Fetch next page when user scrolls to bottom
- Append to existing candidates

---

### **Phase 6: Update Components** ✅

**Step 6.1:** Update `useJobProgressPage.ts`

- Ensure it uses updated `useNormalizedCandidates`
- No other changes needed (uses hook)

**Step 6.2:** Update any direct API consumers

- Check for direct `useFetchCandidatesQuery` usage
- Update to handle new response structure

---

### **Phase 7: Testing** ✅

**Step 7.1:** Test basic functionality

- ✅ Candidates load correctly
- ✅ Lanes display in correct order
- ✅ Counts are accurate

**Step 7.2:** Test filtering

- ✅ Search filter works
- ✅ Top candidates filter works
- ✅ All other filters work

**Step 7.3:** Test SSE updates

- ✅ Status changes update correctly
- ✅ New candidates appear
- ✅ Updates merge properly

**Step 7.4:** Test pagination

- ✅ Load more per lane works
- ✅ Counts update correctly
- ✅ No duplicate candidates

---

## 📝 **Detailed Code Changes**

### **1. Update candidateApi.ts**

```typescript
// Add new interface
export interface GroupedCandidatesResponse {
  lanes: {
    [laneName: string]: {
      candidates: Candidate[];
      count: number;
      hasMore: boolean;
      page: number;
      totalPages: number;
    };
  };
  meta: {
    jobId: string;
    useCustomLanes: boolean;
    availableLanes: string[];
    totalCandidates: number;
  };
}

// Update endpoint
fetchCandidates: builder.query<GroupedCandidatesResponse, string>({
  query: (jobId) => `/jobs/${jobId}/candidates`,
  providesTags: ['Candidate'],
}),
```

---

### **2. Update useNormalizedCandidates.ts**

```typescript
export function useNormalizedCandidates({
  jobId,
  setSelectedCandidate,
  selectedCandidate,
}: UseNormalizedCandidatesProps) {
  // Fetch candidates from API (now returns grouped structure)
  const {
    data: candidatesResponse,
    isLoading: isCandidatesLoading,
    refetch,
  } = useFetchCandidatesQuery(jobId);

  // Get SSE candidates
  const { candidates: sseCandidates } = useSSE(
    setSelectedCandidate,
    selectedCandidate || null,
    jobId,
  );

  // Extract and normalize candidates from grouped response
  const normalizedCandidates = useMemo(() => {
    const candidateMap = new Map<string, NormalizedCandidate>();

    // Extract candidates from API response (grouped by lane)
    if (candidatesResponse?.lanes) {
      Object.values(candidatesResponse.lanes).forEach((lane) => {
        lane.candidates.forEach((candidate) => {
          const normalized = normalizeCandidate(candidate);
          if (normalized) {
            candidateMap.set(normalized._id, normalized);
          }
        });
      });
    }

    // Merge SSE candidates (SSE takes precedence)
    if (sseCandidates) {
      sseCandidates.forEach((sseCandidate) => {
        const normalized = normalizeCandidate(sseCandidate);
        if (normalized) {
          candidateMap.set(normalized._id, normalized);
        }
      });
    }

    return Array.from(candidateMap.values()) as unknown as Candidate[];
  }, [candidatesResponse, sseCandidates]);

  return {
    candidates: normalizedCandidates,
    laneCounts: candidatesResponse?.lanes, // NEW: Return lane counts
    isLoading: isCandidatesLoading,
    refetch,
  };
}
```

---

### **3. Update useJobPageEffects.ts**

```typescript
// Remove client-side lane grouping (lines 242-255)
// Replace with API's grouped structure

useEffect(() => {
  if (normalizedCandidates && lanes && laneCounts) {
    let currentCandidates = [...mergedCandidates];

    // Apply client-side filters (search, topCandidates, etc.)
    if (filterConditions) {
      currentCandidates = applyFilters(currentCandidates, filterConditions);
    }

    // Apply archived filter
    currentCandidates = currentCandidates.filter(
      (candidate) => showArchived || !candidate.isDeleted,
    );

    // Get lanes array
    const lanesArray = updatedLanes || jobLanes?.lanes || userLanes?.lanes || DEFAULT_LANES;

    // Convert API's grouped structure to columns
    const updatedColumns = lanesArray.map((lane) => {
      // Get candidates from API response for this lane
      const laneData = laneCounts[lane];
      const laneCandidates = laneData?.candidates || [];

      // Filter candidates by client-side filters
      const filteredCandidates = laneCandidates.filter((candidate) => {
        // Apply all client-side filters
        return matchesFilters(candidate, filterConditions, showArchived);
      });

      return {
        id: lane as CandidateStatus,
        title: lane,
        candidates: filteredCandidates,
        count: laneData?.count || 0,
        hasMore: laneData?.hasMore || false,
      } as CandidateColumn;
    });

    setColumns(updatedColumns);
  }
}, [normalizedCandidates, lanes, laneCounts, filterConditions, showArchived, ...]);
```

---

### **4. Add Lazy Loading Per Lane (Optional)**

```typescript
// New hook for loading more candidates per lane
export function useLaneCandidates(
  jobId: string,
  laneName: string,
  page: number,
) {
  return useFetchCandidatesQuery({
    jobId,
    lanes: [laneName],
    page,
    limit: 50,
  });
}

// Usage in KanbanColumn
const { data: nextPageData } = useLaneCandidates(
  jobId,
  laneName,
  currentPage + 1,
);
```

---

## ⚠️ **Breaking Changes**

### **1. Response Structure**

- ❌ Old: `Candidate[]`
- ✅ New: `GroupedCandidatesResponse`

**Impact:** All consumers of `fetchCandidates` need update

### **2. Lane Grouping**

- ❌ Old: Done client-side
- ✅ New: Done by API

**Impact:** Remove client-side grouping logic

### **3. Counts**

- ❌ Old: Calculated client-side
- ✅ New: Provided by API

**Impact:** Use API counts instead of calculating

---

## 🔄 **Migration Strategy**

### **Option 1: Big Bang (Recommended)**

- Update all files at once
- Test thoroughly
- Deploy together

**Pros:**

- Clean migration
- No intermediate states
- Easier to test

**Cons:**

- Higher risk
- Requires careful testing

---

### **Option 2: Gradual Migration**

- Add new endpoint alongside old
- Migrate components one by one
- Remove old endpoint when done

**Pros:**

- Lower risk
- Can rollback easily

**Cons:**

- More complex
- Temporary code duplication

---

## ✅ **Migration Checklist**

### **Backend:**

- [x] API returns grouped structure
- [x] Default 50 candidates per lane
- [x] Lane order preserved
- [x] Pagination per lane works

### **Frontend:**

- [ ] Update RTK Query type definition
- [ ] Update `useNormalizedCandidates` hook
- [ ] Update `useJobPageEffects` hook
- [ ] Remove client-side lane grouping
- [ ] Update type definitions
- [ ] Test basic functionality
- [ ] Test filtering
- [ ] Test SSE updates
- [ ] Test pagination per lane
- [ ] Update any direct API consumers

---

## 🧪 **Testing Plan**

### **1. Unit Tests**

- Test `useNormalizedCandidates` with new response
- Test lane grouping conversion
- Test SSE merge logic

### **2. Integration Tests**

- Test full flow: API → Hook → Component
- Test filtering with grouped response
- Test SSE updates with grouped response

### **3. E2E Tests**

- Test Kanban board display
- Test candidate drag & drop
- Test lane counts accuracy
- Test pagination per lane

---

## 🚨 **Potential Issues & Solutions**

### **Issue 1: SSE Updates Don't Match Lane Structure**

**Solution:**

- Keep SSE merge logic
- Update candidate in correct lane after merge
- Re-group if needed

### **Issue 2: Client-Side Filters Applied to Grouped Data**

**Solution:**

- Apply filters per lane
- Filter candidates within each lane
- Preserve lane structure

### **Issue 3: Pagination State Per Lane**

**Solution:**

- Track page number per lane
- Load more on scroll per lane
- Append to existing candidates

---

## 📊 **Performance Considerations**

### **Before (Client-Side Grouping):**

- API: Returns all candidates (could be 10K+)
- Frontend: Groups by lane (O(n))
- Memory: All candidates in memory

### **After (Server-Side Grouping):**

- API: Returns 50 candidates per lane (max ~300 for 6 lanes)
- Frontend: Uses grouped structure directly
- Memory: Only visible candidates + first page

**Improvement:**

- ✅ 97% reduction in initial data transfer (10K → 300)
- ✅ Faster initial load
- ✅ Lower memory usage
- ✅ Scalable to unlimited candidates

---

## 🎯 **Key Takeaways**

1. **API now groups by lane** - Remove client-side grouping
2. **50 candidates per lane default** - Perfect for initial load
3. **Lazy load more** - Fetch additional pages per lane on scroll
4. **Keep client-side filters** - Still apply search, topCandidates, etc.
5. **Merge with SSE** - SSE updates still work, just merge into grouped structure

---

**Ready to start migration?** 🚀
