import type { BulkStatusQueueItem } from '@/components/unified-candidate-dialog/types';

/** Parsed shape of validationInfo JSON (minimal for key extraction). */
interface ParsedValidationInfo {
  currentLane?: string;
  checklistType?: string;
  checklist?: { id?: string };
}

/**
 * Returns a stable key for grouping candidates that share the same checklist
 * (same source lane, type, and checklist id). Only candidates with the same
 * key may safely use "apply to remaining" with the same form payload.
 */
export function getChecklistKey(validationInfo: string): string {
  try {
    const parsed = JSON.parse(validationInfo) as ParsedValidationInfo;
    const lane = parsed.currentLane ?? '';
    const type = parsed.checklistType ?? '';
    const id = parsed.checklist?.id ?? '';
    return `${lane}|${type}|${id}`;
  } catch {
    return '';
  }
}

/** One step in the plan: show checklist for a group (same checklist key) or run a bulk update. */
export type ChecklistPlanStep =
  | {
      type: 'showChecklist';
      candidateIds: string[];
      newStatus: string;
      /** Representative validationInfo for this group (same for all in group). */
      validationInfo: string;
      /** Full queue items for this step (for opening dialog and apply-to-remaining). */
      items: BulkStatusQueueItem[];
    }
  | {
      type: 'bulkUpdate';
      candidateIds: string[];
      newStatus: string;
    };

export interface ChecklistPlan {
  /** Candidates that need no checklist; can be updated in one or more bulk calls. */
  noChecklist: BulkStatusQueueItem[];
  /** Ordered steps: showChecklist (open dialog for group) or bulkUpdate (apply status). */
  steps: ChecklistPlanStep[];
}

/**
 * Builds a plan from a raw queue: noChecklist for direct updates, steps grouped by
 * checklist key so "apply to remaining" only applies to candidates with the same checklist.
 */
export function buildChecklistPlan(queue: BulkStatusQueueItem[]): ChecklistPlan {
  const noChecklist: BulkStatusQueueItem[] = [];
  const byKey = new Map<string, BulkStatusQueueItem[]>();

  for (const item of queue) {
    if (item.validationInfo == null || item.validationInfo === '') {
      noChecklist.push(item);
      continue;
    }
    const key = getChecklistKey(item.validationInfo);
    const list = byKey.get(key) ?? [];
    list.push(item);
    byKey.set(key, list);
  }

  const steps: ChecklistPlanStep[] = [];
  for (const items of byKey.values()) {
    if (items.length === 0) continue;
    const first = items[0];
    const representativeValidationInfo = first.validationInfo!;
    steps.push({
      type: 'showChecklist',
      candidateIds: items.map((i) => i.candidateId),
      newStatus: first.newStatus,
      validationInfo: representativeValidationInfo,
      items,
    });
  }

  return { noChecklist, steps };
}

/**
 * Parses validationInfo and returns isMandatory. Default true if unparseable.
 */
export function parseIsMandatory(validationInfo: string | undefined): boolean {
  if (!validationInfo) return true;
  try {
    const parsed = JSON.parse(validationInfo) as { isMandatory?: boolean };
    return parsed.isMandatory === true;
  } catch {
    return true;
  }
}
