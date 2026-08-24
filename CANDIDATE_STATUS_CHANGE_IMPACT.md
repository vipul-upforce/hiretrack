# Candidate Status Change - Impact Analysis

## 🔄 **What Happens When a Candidate's Status Changes**

### **1. Status Update Flow**

When a candidate's status is updated (moved between lanes):

```
User Action (Drag & Drop / Manual Update)
    ↓
PATCH /api/candidates/[id]/status
    ↓
Database Update (status field changed)
    ↓
SSE Broadcast (real-time update)
    ↓
Frontend Receives Update
    ↓
UI Updates (candidate moves to new lane)
```

---

## 📊 **Impact on Candidates API**

### **Current Behavior:**

#### **1. Lane Counts (Aggregation Query)**
- ✅ **Automatically reflects changes** on next API call
- The aggregation query `getLaneCounts()` counts candidates by current `status`
- When status changes:
  - Old lane count decreases by 1
  - New lane count increases by 1
- ⚠️ **Not real-time** - counts update on next API request

**Example:**
```javascript
// Before status change
GET /api/jobs/123/candidates?groupByLane=counts
{
  "lanes": {
    "screening": { "count": 100 },
    "processing": { "count": 20 }
  }
}

// Candidate moved from "screening" to "processing"

// After status change (on next request)
GET /api/jobs/123/candidates?groupByLane=counts
{
  "lanes": {
    "screening": { "count": 99 },  // Decreased
    "processing": { "count": 21 }  // Increased
  }
}
```

#### **2. Candidate Lists (Pagination)**
- ✅ **Real-time updates via SSE**
- Frontend receives candidate update via SSE
- Candidate is removed from old lane and added to new lane
- ⚠️ **Counts don't update automatically** - need to refetch

#### **3. Pagination State**
- When candidate moves:
  - Removed from source lane's paginated list
  - Added to target lane's paginated list
  - ⚠️ **Page counts may be off** until refetch

---

## 🔴 **Current Limitations**

### **1. Lane Counts Not Real-Time**
- Counts only update when API is called again
- Frontend shows stale counts until refetch
- User might see incorrect counts in lane headers

### **2. Pagination Inconsistency**
- If candidate was on page 2 of source lane:
  - After move, page 2 might have wrong count
  - Total pages might be incorrect
  - Need to refetch to get accurate pagination

### **3. No Count Broadcast**
- SSE broadcasts candidate updates
- But **doesn't broadcast lane count changes**
- Frontend can't update counts without refetching

---

## ✅ **What Works Well**

### **1. Real-Time Candidate Updates**
- ✅ SSE broadcasts candidate changes immediately
- ✅ Frontend receives updates and updates UI
- ✅ Candidate appears in correct lane instantly

### **2. Database Consistency**
- ✅ Status validation ensures valid lane names
- ✅ Aggregation always reflects current state
- ✅ No race conditions in count calculation

### **3. Optimistic Updates**
- ✅ Frontend updates UI immediately (optimistic)
- ✅ Then syncs with server via SSE
- ✅ Good UX - feels instant

---

## 🚀 **Recommended Solutions**

### **Option 1: Broadcast Lane Counts via SSE (Recommended)**

**Backend Changes:**
```typescript
// In status update route
export async function PATCH(...) {
  // Update candidate status
  const updatedCandidate = await Candidate.findByIdAndUpdate(...);
  
  // Calculate new lane counts
  const laneCounts = await getLaneCounts(jobId, organizationId, false);
  
  // Broadcast both candidate update AND counts
  broadcastCandidateUpdate(updatedCandidate);
  broadcastLaneCounts(jobId, laneCounts); // NEW
}
```

**Frontend Changes:**
```typescript
// In useSSE hook
if (data.type === 'laneCountsUpdate') {
  // Update lane counts without refetching
  updateLaneCounts(data.counts);
}
```

**Benefits:**
- ✅ Real-time count updates
- ✅ No need to refetch
- ✅ Consistent UI state

---

### **Option 2: Refetch on Status Change**

**Frontend Changes:**
```typescript
// In useCandidate hook
const completePendingMove = async (candidateId: string) => {
  // Update candidate
  await updateCandidate({ _id: candidateId, status: newStatus });
  
  // Refetch counts
  refetchCounts(); // NEW
};
```

**Benefits:**
- ✅ Simple implementation
- ✅ Always accurate
- ⚠️ Extra API call (acceptable)

---

### **Option 3: Optimistic Count Updates**

**Frontend Changes:**
```typescript
// In useCandidate hook
const completePendingMove = async (candidateId: string) => {
  // Optimistically update counts
  updateLaneCountsOptimistic(sourceLane, targetLane);
  
  // Update candidate
  await updateCandidate({ _id: candidateId, status: newStatus });
  
  // Refetch to confirm (in background)
  refetchCounts();
};
```

**Benefits:**
- ✅ Instant UI update
- ✅ Self-correcting (refetch confirms)
- ✅ Best UX

---

## 📝 **Current Implementation Details**

### **Status Update Endpoint:**
```typescript
// src/app/api/candidates/[id]/status/route.ts
PATCH /api/candidates/[id]/status
Body: { status: "newLaneName" }
```

**What it does:**
1. Validates status against job lanes
2. Updates candidate status in database
3. Updates `tracking.updatedAt`
4. Returns updated candidate
5. ⚠️ **Does NOT broadcast counts**

### **SSE Broadcast:**
```typescript
// src/lib/broadcast/broadCastCandidate.ts
broadcastCandidateUpdate(candidate)
```

**What it does:**
1. Broadcasts candidate update to all connected clients
2. Frontend receives update via SSE
3. ⚠️ **Does NOT broadcast lane counts**

---

## 🎯 **Best Practice Recommendation**

### **Immediate (Quick Fix):**
1. ✅ **Refetch counts after status change**
   - Simple, works immediately
   - One extra API call (acceptable)

### **Future Enhancement:**
2. ✅ **Broadcast lane counts via SSE**
   - Real-time count updates
   - Better UX
   - More complex implementation

---

## 🔍 **Testing Status Changes**

### **Test Scenario:**
1. Load Kanban board with counts
2. Move candidate from "screening" to "processing"
3. Observe:
   - ✅ Candidate moves immediately (SSE)
   - ⚠️ Counts may be stale until refetch
   - ✅ Next API call shows correct counts

### **Expected Behavior:**
- Candidate appears in new lane: **Immediate** ✅
- Old lane count decreases: **On refetch** ⚠️
- New lane count increases: **On refetch** ⚠️

---

## 💡 **Key Takeaways**

1. **Candidate updates are real-time** via SSE ✅
2. **Lane counts are NOT real-time** - update on refetch ⚠️
3. **Database is always consistent** - aggregation reflects current state ✅
4. **Frontend should refetch counts** after status changes for accuracy
5. **Future enhancement:** Broadcast counts via SSE for real-time updates

---

**Current Status:** ✅ Works, but counts need refetch for accuracy
**Recommended:** Add count refetch after status change (quick fix)

