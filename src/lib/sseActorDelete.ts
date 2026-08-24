/**
 * Tracks candidate ids that this client (actor) just deleted so we can skip
 * adding them to removedCandidates when the same remove arrives via SSE.
 * Avoids double -1 lane count (refetch already updated; SSE would apply again).
 */

const ACTOR_DELETE_TTL_MS = 15000;

const actorDeletedIds = new Map<string, number>();

export function setActorJustDeletedCandidateId(id: string): void {
  actorDeletedIds.set(id, Date.now());
  // Prune expired so map doesn't grow
  const now = Date.now();
  for (const [k, at] of actorDeletedIds.entries()) {
    if (now - at > ACTOR_DELETE_TTL_MS) actorDeletedIds.delete(k);
  }
}

/**
 * Returns true if this id was deleted by this client within TTL.
 * Does not consume — we skip adding to removedCandidates every time for this id until TTL expires.
 */
export function isActorDeletedCandidateId(id: string): boolean {
  const at = actorDeletedIds.get(id);
  if (!at) return false;
  if (Date.now() - at > ACTOR_DELETE_TTL_MS) {
    actorDeletedIds.delete(id);
    return false;
  }
  return true;
}
