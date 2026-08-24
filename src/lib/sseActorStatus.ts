/**
 * Tracks candidate ids whose STATUS was just updated by this client (actor).
 * Used so Client A can rely on RTK Query refetch for counts and skip
 * applying SSE laneCountDeltas for its own status changes.
 */

const ACTOR_STATUS_TTL_MS = 15000;

const actorStatusUpdatedIds = new Map<string, number>();

export function setActorJustStatusUpdatedCandidateId(id: string): void {
  actorStatusUpdatedIds.set(id, Date.now());
  // Prune expired entries so the map doesn't grow unbounded
  const now = Date.now();
  for (const [key, at] of actorStatusUpdatedIds.entries()) {
    if (now - at > ACTOR_STATUS_TTL_MS) {
      actorStatusUpdatedIds.delete(key);
    }
  }
}

/**
 * Returns true if this candidate's status was updated by THIS client
 * within the TTL window. Used in SSE handling to avoid double-applying
 * lane count deltas on the actor tab (RTK Query refetch already updated counts).
 */
export function isActorStatusUpdatedCandidateId(id: string): boolean {
  const at = actorStatusUpdatedIds.get(id);
  if (!at) return false;
  if (Date.now() - at > ACTOR_STATUS_TTL_MS) {
    actorStatusUpdatedIds.delete(id);
    return false;
  }
  return true;
}

