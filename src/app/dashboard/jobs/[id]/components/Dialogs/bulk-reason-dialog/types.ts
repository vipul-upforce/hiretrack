/**
 * Payload for opening the bulk "status change reason" dialog.
 * Used when promptForStatusChangeReason is true and multiple candidates are updated.
 */
export interface BulkReasonPayload {
  type: 'bulkReason';
  candidateIds: string[];
  newStatus: string;
  /** When true, status was already applied (e.g. club-and-drop); dialog only adds remark. */
  statusAlreadyApplied?: boolean;
  sourceLaneId?: string;
}

export function parseBulkReasonPayload(
  openRemarksFor: string | null,
): BulkReasonPayload | null {
  if (!openRemarksFor || typeof openRemarksFor !== 'string') return null;
  if (!openRemarksFor.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(openRemarksFor) as { type?: string; candidateIds?: string[]; newStatus?: string; statusAlreadyApplied?: boolean; sourceLaneId?: string };
    if (parsed.type !== 'bulkReason' || !Array.isArray(parsed.candidateIds) || parsed.candidateIds.length === 0) {
      return null;
    }
    return {
      type: 'bulkReason',
      candidateIds: parsed.candidateIds,
      newStatus: parsed.newStatus ?? '',
      statusAlreadyApplied: parsed.statusAlreadyApplied,
      sourceLaneId: parsed.sourceLaneId,
    };
  } catch {
    return null;
  }
}

export function stringifyBulkReasonPayload(payload: Omit<BulkReasonPayload, 'type'>): string {
  return JSON.stringify({ ...payload, type: 'bulkReason' });
}
