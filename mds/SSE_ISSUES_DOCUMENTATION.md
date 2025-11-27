# SSE (Server-Sent Events) Issues & Problems Documentation

## Overview
This document catalogs all potential issues, misconfigurations, and logical problems in the SSE implementation for real-time updates in HireTrack.

---

## Table of Contents
1. [Critical Code Issues](#critical-code-issues)
2. [Configuration Problems](#configuration-problems)
3. [Logical Issues](#logical-issues)
4. [Security Concerns](#security-concerns)
5. [Performance & Scalability Issues](#performance--scalability-issues)
6. [Race Conditions](#race-conditions)
7. [Error Handling Gaps](#error-handling-gaps)
8. [SSE Event Types & Actions](#sse-event-types--actions)
9. [Test Case Generation Guide](#test-case-generation-guide)

---

## Critical Code Issues

### 1. Missing orgId Validation in `broadcastMultipleCandidateUpdate`
**Location:** `src/lib/broadcast/broadCastCandidate.ts:46`

**Issue:**
export function broadcastMultipleCandidateUpdate(
  candidates: (ICandidate & { history?: ICandidateHistory[] })[]
) {
  const orgId = candidates[0]?.organizationId;  // ⚠️ No validation if array is empty
  const orgClients = global.sseNotificationClients?.get(orgId);
  // ...
}**Problem:**
- If `candidates` array is empty, `candidates[0]` is `undefined`
- `orgId` becomes `undefined`, causing silent failure
- No error thrown, broadcast fails silently

**How to Generate Test Case:**avascript
// Test: Empty candidates array
broadcastMultipleCandidateUpdate([]);
// Expected: Should handle gracefully or throw error
// Actual: Silent failure, no broadcast---

### 2. Missing orgClients Initialization Check in `broadcastLaneUpdate`
**Location:** `src/lib/broadcast/broadCastCandidate.ts:66`

**Issue:**ript
export function broadcastLaneUpdate(
  orgId: string,
  lanes: string[],
  jobId?: string
) {
  const orgClients = global.sseNotificationClients?.get(orgId);
  if (!orgClients) return;  // ⚠️ Missing orgId validation before this
  
  // ...
}**Problem:**
- If `orgId` is `undefined` or `null`, `get(undefined)` returns `undefined`
- Function returns silently without error
- No validation that `orgId` is a valid string

**How to Generate Test Case:**ript
// Test: Invalid orgId
broadcastLaneUpdate(undefined, ["lane1", "lane2"]);
broadcastLaneUpdate(null, ["lane1", "lane2"]);
broadcastLaneUpdate("", ["lane1", "lane2"]);
// Expected: Should validate and throw error or log warning
// Actual: Silent failure---

### 3. Async forEach Without Await in Broadcast Functions
**Location:** `src/lib/broadcast/broadCastCandidate.ts:26, 51`

**Issue:**
orgClients?.forEach(async (client: any) => {
  try {
    const encodedSSE = await signToken(candidate, orgId);  // ⚠️ Async operation
    // ...
  } catch (error) {
    console.error(`Failed to send message to client ${client.id}:`, error);
  }
});
**Problem:**
- `forEach` doesn't wait for async callbacks
- If `signToken` fails, error is caught but function continues
- No way to know if all broadcasts succeeded
- Potential race conditions if multiple broadcasts happen simultaneously

**How to Generate Test Case:**
// Test: Multiple rapid broadcasts
for (let i = 0; i < 10; i++) {
  broadcastCandidateUpdate(candidate);
}
// Expected: All should complete, errors should be tracked
// Actual: Errors may be lost, no completion tracking---

### 4. Missing orgId in `getDecodedSSE` Cookie Dependency
**Location:** `src/hooks/useSSE.ts:9-21`

**Issue:**t
export async function getDecodedSSE(encodedData: string) {
  console.log(encodedData, "encodedData");
  const orgId = Cookies.get("org_id");  // ⚠️ Client-side cookie dependency
  console.log(orgId, "orgId in getDecodedSSE");

  try {
    const data = await verifyAndDecryptSSE(encodedData, orgId);
    return data;
  } catch (error) {
    console.error("SSE decryption error:", error);
    return null;  // ⚠️ Returns null on error, no distinction between error types
  }
}**Problem:**
- If cookie is missing/expired, `orgId` is `undefined`
- Decryption fails but returns `null` without distinction
- No error propagation to caller
- Client-side cookie can be manipulated

**How to Generate Test Case:**
// Test: Missing org_id cookie
// 1. Clear cookies in browser
// 2. Receive SSE event
// Expected: Should handle gracefully, maybe reconnect or show error
// Actual: Returns null, no error indication---

### 5. Race Condition in Client Registration
**Location:** `src/app/api/sse/notifications/route.ts:81-82`

**Issue:**ypescript
const clientId = Date.now() + Math.floor(Math.random() * 1000);
orgClients.set(clientId, { id: clientId, orgId, userId, controller });**Problem:**
- If two clients connect in same millisecond, `Date.now()` could be identical
- Random addition might not be enough for high concurrency
- Potential client ID collision leading to overwrites

**How to Generate Test Case:**
// Test: Simultaneous connections
// Open 100 browser tabs simultaneously
// Expected: All should get unique client IDs
// Actual: Potential collisions---

### 6. Missing Error Handling in Initial Unread Count Fetch
**Location:** `src/app/api/sse/notifications/route.ts:61-79`

**Issue:**
(async () => {
  try {
    await connectToDatabase();
    if (Notification) {
      const unread = await Notification.countDocuments({
        organizationId: orgId,
        recipientId: userId,
        isRead: false,
      });
      controller.enqueue(/* ... */);
    }
  } catch (e) {
    // fail quietly  // ⚠️ Silent failure
  }
})();**Problem:**
- Errors are swallowed silently
- If database connection fails, no notification count is sent
- Client doesn't know if count is accurate or missing
- No retry mechanism

**How to Generate Test Case:**
// Test: Database connection failure during SSE connection
// 1. Stop MongoDB
// 2. Connect to SSE endpoint
// Expected: Should handle error gracefully, maybe show 0 or retry
// Actual: Silent failure, no count sent---

## Configuration Problems

### 7. No Rate Limiting on SSE Endpoints
**Location:** `src/app/api/sse/notifications/route.ts`, `src/app/api/sse/candidates/route.ts`

**Issue:**
- SSE endpoints have no rate limiting
- Malicious users could open unlimited connections
- Potential DoS attack vector

**How to Generate Test Case:**pt
// Test: Connection spam
for (let i = 0; i < 1000; i++) {
  fetch('/api/sse/notifications');
}
// Expected: Should rate limit after reasonable number
// Actual: All connections accepted, potential memory exhaustion---

### 8. Heartbeat Interval Too Long
**Location:** `src/app/api/sse/notifications/route.ts:84-91`

**Issue:**t
const heartbeat = setInterval(() => {
  // ...
}, 20000);  // 20 seconds**Problem:**
- 20 seconds might be too long for some proxies/load balancers
- Some infrastructure times out connections after 15-30 seconds of inactivity
- Connection might drop before heartbeat

**How to Generate Test Case:**script
// Test: Proxy timeout
// 1. Configure proxy with 15-second timeout
// 2. Connect to SSE
// Expected: Heartbeat should keep connection alive
// Actual: Connection might drop before 20s heartbeat---

### 9. No Maximum Connection Limits
**Issue:**
- No limit on connections per organization
- No limit on connections per user
- Single user could exhaust server resources

**How to Generate Test Case:**ipt
// Test: Single user multiple connections
// Open 50 tabs as same user
// Expected: Should limit or reuse connections
// Actual: 50 separate connections created---

### 10. Missing CORS Headers for SSE
**Location:** `src/app/api/sse/notifications/route.ts:104-110`

**Issue:**t
return new NextResponse(stream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    // ⚠️ No CORS headers
  },
});**Problem:**
- If frontend is on different domain, SSE might fail
- No `Access-Control-Allow-Origin` header
- Cross-origin requests might be blocked

**How to Generate Test Case:**script
// Test: Cross-origin SSE
// 1. Deploy frontend on different domain
// 2. Try to connect to SSE
// Expected: Should work with proper CORS
// Actual: Might be blocked by browser---

## Logical Issues

### 11. Client Count Inaccuracy
**Location:** `src/app/api/sse/notifications/route.ts:53, 85`

**Issue:**
const clientsCount = orgClients.size;  // ⚠️ Counted before client is added
// ...
orgClients.set(clientId, { id: clientId, orgId, userId, controller });**Problem:**
- Client count is sent before the new client is added to the map
- Count is always 1 less than actual
- Race condition: count might change between calculation and sending

**How to Generate Test Case:**ipt
// Test: Client count accuracy
// 1. Connect 5 clients
// 2. Check "clients" event count
// Expected: Should show 5
// Actual: Might show 4 (counted before adding)---

### 12. Lane Updates Don't Filter by jobId on Client Side
**Location:** `src/lib/broadcast/broadCastCandidate.ts:61-85`, `src/hooks/useNotificationSSE.ts:126-129`

**Issue:**ipt
// Server sends lanes without jobId context
const data = `data: ${JSON.stringify({ type: "lanesUpdate", lanes })}\n\n`;

// Client receives all lane updates regardless of jobId
if (data.type === "lanesUpdate") {
  this.subscribers.forEach((sub) => {
    sub.onLanesUpdate?.(data.lanes);  // ⚠️ No jobId filtering
  });
}**Problem:**
- Job-specific lane updates are broadcast to all clients
- Clients on different jobs receive irrelevant updates
- Client has no way to filter by jobId

**How to Generate Test Case:**avascript
// Test: Job-specific lane updates
// 1. User A on Job 1 updates lanes
// 2. User B on Job 2 receives the update
// Expected: User B should not receive Job 1 lane updates
// Actual: User B receives all lane updates---

### 13. Multiple Candidate Updates Overwrite Each Other
**Location:** `src/hooks/useNotificationSSE.ts:199-217`

**Issue:**pt
const handleCandidateUpdate = useCallback((updatedCandidate: Candidate) => {
  setCandidates((prev) => {
    const index = prev.findIndex((c) => c._id === updatedCandidate._id);
    if (index >= 0) {
      return [
        ...prev.slice(0, index),
        updatedCandidate,  // ⚠️ Complete replacement
        ...prev.slice(index + 1),
      ];
    }
    return [...prev, updatedCandidate];
  });
}, []);**Problem:**
- If multiple updates arrive rapidly, state updates might overwrite each other
- React state batching might cause lost updates
- No merging strategy for partial updates

**How to Generate Test Case:**
// Test: Rapid candidate updates
// 1. Update candidate status
// 2. Immediately update candidate assignment
// 3. Immediately update candidate remarks
// Expected: All updates should be applied
// Actual: Some updates might be lost due to state batching---

### 14. Notification Count Incorrect on Reconnect
**Location:** `src/hooks/useNotificationSSE.ts:183-186`

**Issue:**pescript
const handleNotificationCountUpdated = useCallback((count: number) => {
  setTotalCount((c) => c + 1);  // ⚠️ Always increments
  setUnreadCount(count);
}, []);**Problem:**
- `totalCount` is always incremented, even on reconnect
- If client reconnects and receives initial count, `totalCount` becomes incorrect
- No distinction between new notification and initial count

**How to Generate Test Case:**pt
// Test: Reconnect notification count
// 1. Have 5 unread notifications
// 2. Disconnect SSE
// 3. Reconnect SSE
// Expected: totalCount should be accurate
// Actual: totalCount might be incremented incorrectly---

### 15. Stale Connection Cleanup
**Location:** `src/app/api/sse/notifications/route.ts:93-100`

**Issue:**pt
req.signal.addEventListener("abort", () => {
  orgClients.delete(clientId);
  // ⚠️ No cleanup if controller is already closed
  // ⚠️ No cleanup if client disconnects without abort signal
});**Problem:**
- If client closes browser without proper disconnect, connection might not be cleaned up
- Stale entries in `orgClients` map
- Memory leak over time

**How to Generate Test Case:**ascript
// Test: Stale connection cleanup
// 1. Connect to SSE
// 2. Force kill browser process (not graceful close)
// Expected: Connection should be cleaned up
// Actual: Connection might remain in map---

## Security Concerns

### 16. Token Signing Failures Not Handled
**Location:** `src/lib/broadcast/broadCastCandidate.ts:28`, `src/lib/broadcast/broadcastNotifications.ts:13`

**Issue:**ript
const encodedSSE = await signToken(candidate, orgId);  // ⚠️ No error handling**Problem:**
- If `signToken` throws, the entire broadcast fails
- Error is caught in forEach but not propagated
- No retry mechanism
- If JWT_SECRET is misconfigured, all broadcasts fail silently

**How to Generate Test Case:**t
// Test: Token signing failure
// 1. Set invalid JWT_SECRET
// 2. Try to broadcast candidate update
// Expected: Should log error and handle gracefully
// Actual: Silent failure, no broadcast---

### 17. No Validation of Broadcast Data
**Location:** All broadcast functions

**Issue:**
- No validation that candidate/notification data is valid
- No size limits on broadcast payload
- Malicious or corrupted data could be broadcast

**How to Generate Test Case:**
// Test: Invalid broadcast data
broadcastCandidateUpdate({
  organizationId: "valid-org",
  _id: null,  // Invalid
  // ... other invalid fields
});
// Expected: Should validate before broadcasting
// Actual: Broadcasts invalid data---

### 18. Potential XSS in Decoded Data
**Location:** `src/hooks/useNotificationSSE.ts:82-137`

**Issue:**
- Decoded SSE data is not sanitized
- If malicious data is stored in database and broadcast, it could execute in client
- No HTML sanitization for notification messages

**How to Generate Test Case:**cript
// Test: XSS in notification
// 1. Create notification with: <script>alert('XSS')</script>
// 2. Broadcast notification
// Expected: Should sanitize HTML
// Actual: Script might execute---

## Performance & Scalability Issues

### 19. Global State in Memory
**Location:** `src/app/api/sse/notifications/route.ts:16-18`

**Issue:**cript
global.sseNotificationClients =
  global.sseNotificationClients ||
  new Map<string, Map<number, NotificationSSEClient>>();**Problem:**
- In-memory storage doesn't work in serverless/horizontal scaling
- Multiple server instances don't share state
- Connections lost on server restart
- No persistence

**How to Generate Test Case:**
// Test: Server restart
// 1. Connect multiple clients
// 2. Restart server
// Expected: Clients should reconnect
// Actual: All connections lost, no reconnection---

### 20. No Connection Pooling or Reuse
**Issue:**
- Each component using SSE creates new connection
- `SSEManager` is singleton but connection is per-instance
- Multiple React components = multiple connections (though singleton should prevent this)

**How to Generate Test Case:**script
// Test: Multiple component subscriptions
// 1. Mount 10 components using useNotificationSSE
// Expected: Should reuse single connection
// Actual: Should work (singleton), but verify---

### 21. No Message Queue for Failed Broadcasts
**Issue:**
- If broadcast fails, message is lost
- No retry mechanism
- No queue for offline clients

**How to Generate Test Case:**ipt
// Test: Broadcast to disconnected client
// 1. Disconnect client
// 2. Broadcast notification
// Expected: Should queue and deliver on reconnect
// Actual: Message is lost---

## Race Conditions

### 22. Client Registration Race Condition
**Location:** `src/app/api/sse/notifications/route.ts:35-42, 81-82`

**Issue:**
if (!global.sseNotificationClients.has(orgId)) {
  global.sseNotificationClients.set(orgId, new Map());
}
const orgClients = global.sseNotificationClients.get(orgId)!;
// ... later ...
orgClients.set(clientId, { ... });**Problem:**
- Two requests could check `has(orgId)` simultaneously
- Both could create new Map
- One overwrites the other
- Client might be added to wrong map instance

**How to Generate Test Case:**
// Test: Simultaneous connection from same org
// 1. Send 100 simultaneous GET requests to /api/sse/notifications
// Expected: All should be registered correctly
// Actual: Potential race condition---

### 23. Heartbeat and Disconnect Race Condition
**Location:** `src/app/api/sse/notifications/route.ts:84-100`

**Issue:**ipt
const heartbeat = setInterval(() => {
  // Send heartbeat
}, 20000);

req.signal.addEventListener("abort", () => {
  clearInterval(heartbeat);  // ⚠️ Race: heartbeat might fire after clear
  controller.close();
});**Problem:**
- Heartbeat might try to send after controller is closed
- Error might be thrown
- No check if controller is still open

**How to Generate Test Case:**cript
// Test: Disconnect during heartbeat
// 1. Connect to SSE
// 2. Wait 19 seconds
// 3. Disconnect immediately
// Expected: Should clean up without errors
// Actual: Heartbeat might try to send after close
---

## Error Handling Gaps

### 24. Controller.enqueue Error Not Handled
**Location:** All broadcast functions

**Issue:**escript
try {
  client.controller.enqueue(encoder.encode(data));
} catch (error) {
  console.error(`Failed to send message to client ${client.id}:`, error);
  // ⚠️ Client not removed from map
}**Problem:**
- If `enqueue` fails (e.g., stream closed), client remains in map
- Future broadcasts will continue to fail
- No cleanup of dead connections

**How to Generate Test Case:**
// Test: Closed stream broadcast
// 1. Connect client
// 2. Manually close stream on server
// 3. Try to broadcast
// Expected: Should detect and remove dead client
// Actual: Error logged, client remains---

### 25. Decryption Failure Returns Null Without Context
**Location:** `src/hooks/useSSE.ts:9-21`, `src/hooks/useNotificationSSE.ts:106-124`

**Issue:**
const updatedCandidate = await getDecodedSSE(encodedCandidate);
if (updatedCandidate && updatedCandidate._id) {  // ⚠️ No distinction between null and error
  // ...
}
**Problem:**
- Can't distinguish between "decryption failed" and "no data"
- No error logging for debugging
- Silent failures make debugging difficult

**How to Generate Test Case:**
// Test: Invalid encrypted data
// 1. Send malformed encrypted candidate
// Expected: Should log error and handle
// Actual: Returns null, no error indication---

## SSE Event Types & Actions

### Complete List of SSE Events

#### 1. **Connection Events**
- `connected` - Sent when SSE connection is established
  - **Triggered by:** `src/app/api/sse/notifications/route.ts:47-50`
  - **Consumed by:** `src/hooks/useNotificationSSE.ts:48-52`
  - **Issues:** No error if connection fails after this

#### 2. **Client Count Events**
- `clients` - Sent with current client count
  - **Triggered by:** 
    - Initial connection: `src/app/api/sse/notifications/route.ts:53-58`
    - Heartbeat: `src/app/api/sse/notifications/route.ts:84-91`
    - Candidate updates: `src/lib/broadcast/broadCastCandidate.ts:33-37`
    - Lane updates: `src/lib/broadcast/broadCastCandidate.ts:76-80`
  - **Consumed by:** `src/hooks/useNotificationSSE.ts:132-136`
  - **Issues:** Count might be inaccurate (see Issue #11)

#### 3. **Notification Events**
- `notification` - Single notification update
  - **Triggered by:** `src/lib/broadcast/broadcastNotifications.ts:4-27`
  - **Consumed by:** `src/hooks/useNotificationSSE.ts:89-93`
  - **Actions that trigger:**
    - `src/lib/notifications/notificationService.ts:66-70` - Single notification creation
  - **Issues:** No validation, potential XSS (see Issue #18)

- `notifications` - Multiple notifications update
  - **Triggered by:** `src/lib/broadcast/broadcastNotifications.ts:29-60`
  - **Consumed by:** `src/hooks/useNotificationSSE.ts:95-104`
  - **Actions that trigger:**
    - `src/lib/notifications/notificationService.ts:129` - Bulk notification creation
  - **Issues:** Array validation missing (see Issue #17)

- `notificationCountUpdated` - Unread count update
  - **Triggered by:**
    - Initial connection: `src/app/api/sse/notifications/route.ts:70-74`
    - `src/lib/broadcast/broadcastNotifications.ts:62-80`
  - **Consumed by:** `src/hooks/useNotificationSSE.ts:83-86`
  - **Actions that trigger:**
    - `src/lib/notifications/notificationService.ts:76-80` - After notification creation
    - `src/lib/notifications/notificationService.ts:140-144` - After bulk notifications
    - `src/app/api/notifications/[id]/read/route.ts:71` - After marking read
    - `src/app/api/notifications/mark-all-read/route.ts:45` - After marking all read
  - **Issues:** Count might be incorrect on reconnect (see Issue #14)

#### 4. **Candidate Events**
- `candidateUpdate` - Single candidate update
  - **Triggered by:** `src/lib/broadcast/broadCastCandidate.ts:18-42`
  - **Consumed by:** `src/hooks/useNotificationSSE.ts:106-114`
  - **Actions that trigger:**
    - `src/app/api/candidates/evaluate/route.ts:486` - After candidate evaluation
    - `src/app/api/candidates/[id]/route.ts:1338, 1547` - After candidate updates
    - `src/app/api/candidates/route.ts:350` - After candidate creation
    - `src/app/api/candidates/history/route.ts:412, 626` - After history updates
    - `src/app/api/candidates/[id]/submit-checklist/route.ts:305` - After checklist submission
    - `src/app/api/jobs/open/route.ts:194` - After opening job application
  - **Issues:** 
    - Async forEach without await (see Issue #3)
    - Token signing failures not handled (see Issue #16)
    - Race conditions with rapid updates (see Issue #13)

- `multipleCandidateUpdate` - Multiple candidate updates
  - **Triggered by:** `src/lib/broadcast/broadCastCandidate.ts:43-60`
  - **Consumed by:** `src/hooks/useNotificationSSE.ts:116-124`
  - **Actions that trigger:**
    - `src/app/api/lanes/[laneId]/route.ts:116, 267` - After lane operations
  - **Issues:**
    - Missing orgId validation (see Issue #1)
    - Empty array handling (see Issue #1)

#### 5. **Lane Events**
- `lanesUpdate` - Lane configuration update
  - **Triggered by:** `src/lib/broadcast/broadCastCandidate.ts:61-85`
  - **Consumed by:** `src/hooks/useNotificationSSE.ts:126-130`
  - **Actions that trigger:**
    - `src/app/api/lanes/route.ts:179, 214` - After lane updates
    - `src/app/api/lanes/[laneId]/route.ts:65, 218` - After lane operations
    - `src/app/api/jobs/[id]/lanes/[laneName]/route.ts:130, 265` - After job-specific lane updates
  - **Issues:**
    - Missing orgClients check (see Issue #2)
    - No jobId filtering on client (see Issue #12)

---

## Test Case Generation Guide

### General Testing Strategy

1. **Connection Testing**
   - Test simultaneous connections
   - Test reconnection after disconnect
   - Test connection during server restart
   - Test connection with invalid auth

2. **Data Validation Testing**
   - Test with null/undefined values
   - Test with empty arrays
   - Test with malformed data
   - Test with extremely large payloads

3. **Error Scenario Testing**
   - Test database connection failures
   - Test token signing failures
   - Test decryption failures
   - Test network interruptions

4. **Concurrency Testing**
   - Test rapid sequential updates
   - Test simultaneous updates from multiple users
   - Test race conditions in client registration

5. **Security Testing**
   - Test XSS in notification messages
   - Test unauthorized access attempts
   - Test token manipulation
   - Test rate limiting

### Specific Test Cases

#### Test Case 1: Empty Candidates Array Broadcastvascript
// Setup
const emptyCandidates = [];

// Action
broadcastMultipleCandidateUpdate(emptyCandidates);

// Expected
// - Should validate array is not empty
// - Should log warning or throw error
// - Should not attempt broadcast

// Actual
// - Silent failure, no broadcast attempted#### Test Case 2: Invalid orgId in Lane Updateascript
// Setup
const invalidOrgIds = [undefined, null, "", "non-existent-org"];

// Action
invalidOrgIds.forEach(orgId => {
  broadcastLaneUpdate(orgId, ["lane1", "lane2"]);
});

// Expected
// - Should validate orgId before broadcast
// - Should log error for invalid orgId

// Actual
// - Silent failure for all invalid orgIds#### Test Case 3: Rapid Candidate Updatesscript
// Setup
const candidate = { _id: "123", organizationId: "org1", /* ... */ };

// Action
for (let i = 0; i < 10; i++) {
  setTimeout(() => {
    broadcastCandidateUpdate({ ...candidate, status: `status-${i}` });
  }, i * 10); // 10ms apart
}

// Expected
// - All 10 updates should be received
// - Final state should reflect last update

// Actual
// - Some updates might be lost due to React state batching#### Test Case 4: Connection Spam Attackript
// Setup
const attackConnections = 1000;

// Action
for (let i = 0; i < attackConnections; i++) {
  fetch('/api/sse/notifications', {
    headers: { Cookie: 'auth_token=valid_token; org_id=org1' }
  });
}

// Expected
// - Should rate limit after reasonable number (e.g., 10 per user)
// - Should reject excess connections

// Actual
// - All connections accepted
// - Potential memory exhaustion#### Test Case 5: Stale Connection Cleanupascript
// Setup
// 1. Connect client to SSE
// 2. Note clientId in server logs

// Action
// 1. Force kill browser process (not graceful close)
// 2. Wait 30 seconds
// 3. Check server memory for client entry

// Expected
// - Client should be removed from orgClients map
// - Memory should be freed

// Actual
// - Client might remain in map
// - Memory leak#### Test Case 6: Token Signing Failureascript
// Setup
// 1. Set invalid JWT_SECRET in environment
// 2. Restart server

// Action
const candidate = { _id: "123", organizationId: "org1", /* ... */ };
broadcastCandidateUpdate(candidate);

// Expected
// - Should log error
// - Should handle gracefully
// - Should not crash

// Actual
// - Silent failure
// - No error indication#### Test Case 7: Job-Specific Lane Update Leakageipt
// Setup
// 1. User A on Job 1
// 2. User B on Job 2
// Both connected to SSE

// Action
// 1. User A updates lanes for Job 1
// 2. Check if User B receives the update

// Expected
// - User B should NOT receive Job 1 lane updates
// - Only Job 2 updates should be received

// Actual
// - User B receives all lane updates
// - No jobId filtering#### Test Case 8: Reconnect Notification Countript
// Setup
// 1. Have 5 unread notifications
// 2. Connect to SSE (receives count: 5)
// 3. totalCount is set to 5

// Action
// 1. Disconnect SSE
// 2. Reconnect SSE
// 3. Check totalCount after receiving initial count

// Expected
// - totalCount should remain 5 (not incremented)
// - Unread count should be 5

// Actual
// - totalCount might be incremented to 6
// - Incorrect count#### Test Case 9: Decryption Failure Handlingcript
// Setup
// 1. Send malformed encrypted candidate data
// 2. Or send data with wrong orgId

// Action
// SSE receives candidateUpdate event with invalid encrypted data

// Expected
// - Should log decryption error
// - Should handle gracefully
// - Should not crash client

// Actual
// - Returns null
// - No error logging
// - Silent failure#### Test Case 10: Heartbeat After Disconnect
// Setup
// 1. Connect to SSE
// 2. Note heartbeat interval (20s)

// Action
// 1. Wait 19 seconds
// 2. Disconnect client immediately
// 3. Check server logs for errors

// Expected
// - Heartbeat should be cleared
// - No attempt to send after disconnect
// - No errors in logs

// Actual
// - Heartbeat might try to send after controller.close()
// - Error might be thrown---

## Recommendations

### Immediate Fixes (Critical)
1. Add orgId validation in all broadcast functions
2. Add empty array validation in `broadcastMultipleCandidateUpdate`
3. Fix async forEach to use Promise.all or for...of loop
4. Add error handling for token signing failures
5. Fix client count calculation (count after adding client)
6. Add connection cleanup for dead clients

### High Priority
7. Add rate limiting to SSE endpoints
8. Reduce heartbeat interval to 10-15 seconds
9. Add maximum connection limits per org/user
10. Add jobId filtering for lane updates
11. Fix notification count on reconnect
12. Add CORS headers if needed

### Medium Priority
13. Add message queue for failed broadcasts
14. Add retry mechanism for failed broadcasts
15. Add validation for broadcast data
16. Add HTML sanitization for notifications
17. Consider Redis for shared state in multi-instance deployments

### Low Priority
18. Add connection pooling/reuse optimizations
19. Add metrics/monitoring for SSE connections
20. Add compression for SSE streams
21. Improve error messages and logging

---

## Monitoring & Debugging

### Key Metrics to Monitor
- Number of active SSE connections per organization
- Number of failed broadcasts
- Average message delivery time
- Connection drop rate
- Reconnection frequency
- Memory usage of global.sseNotificationClients

### Debugging Tips
1. Enable verbose logging for SSE events
2. Log all broadcast attempts and failures
3. Monitor global.sseNotificationClients size
4. Track client registration/deregistration
5. Log decryption failures with context
6. Monitor heartbeat intervals and failures

---

## Conclusion

This documentation identifies 25+ issues across critical code problems, configuration issues, logical flaws, security concerns, and performance bottlenecks. The most critical issues should be addressed immediately to ensure system reliability and security.

**Priority Order:**
1. Critical Code Issues (#1-6)
2. Security Concerns (#16-18)
3. Configuration Problems (#7-10)
4. Logical Issues (#11-15)
5. Performance & Scalability (#19-21)
6. Race Conditions (#22-23)
7. Error Handling (#24-25)
```

This document covers:
- Critical code issues with specific locations
- Configuration problems
- Logical issues
- Security concerns
- Performance and scalability issues
- Race conditions
- Error handling gaps
- Complete list of SSE events and their triggers
- Test case generation guide for each issue

Each issue includes:
- Location in codebase
- Problem description
- How to generate a test case to reproduce it
- Expected vs actual behavior

Use this to prioritize fixes and test the SSE implementation.
