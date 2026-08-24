import type { Candidate } from '@/types/candidate';
import type { JobViewState } from './jobViewStorage';

const DATE_SORT_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'tracking.createdAt',
  'tracking.updatedAt',
  'assignment.assignedAt',
  'followUp.date',
]);

const NUMBER_SORT_FIELDS = new Set([
  'scores.overall',
  'experience',
  'expectedCTC',
  'currentCTC',
  'noticePeriod',
]);

/** Read nested values using API sort field paths (e.g. tracking.updatedAt). */
export function getNestedCandidateValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.').filter(Boolean);
  let current: unknown = obj;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Resolve effective sort for a lane (matches KanbanColumnCursor precedence).
 */
export function resolveLaneSortConfig(
  laneId: string,
  viewState?: JobViewState | null,
  columnSorting?: { sortBy: string; sortOrder: 'asc' | 'desc' },
): { sortBy: string; sortOrder: 'asc' | 'desc' } {
  const laneSortEntry = viewState?.laneSort?.[laneId];
  const sortBy =
    laneSortEntry?.sortBy ??
    columnSorting?.sortBy ??
    viewState?.sortBy ??
    'tracking.createdAt';

  let sortOrder: 'asc' | 'desc' = 'desc';
  if (laneSortEntry?.sortOrder === 1) sortOrder = 'asc';
  else if (laneSortEntry?.sortOrder === -1) sortOrder = 'desc';
  else if (columnSorting?.sortOrder) sortOrder = columnSorting.sortOrder;
  else if (viewState?.sortOrder) sortOrder = viewState.sortOrder;

  return { sortBy, sortOrder };
}

function compareSortValues(
  left: unknown,
  right: unknown,
  sortBy: string,
): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;

  if (DATE_SORT_FIELDS.has(sortBy)) {
    const leftDate = left instanceof Date ? left : new Date(String(left));
    const rightDate = right instanceof Date ? right : new Date(String(right));
    const leftTime = leftDate.getTime();
    const rightTime = rightDate.getTime();
    if (!Number.isFinite(leftTime) && !Number.isFinite(rightTime)) return 0;
    if (!Number.isFinite(leftTime)) return 1;
    if (!Number.isFinite(rightTime)) return -1;
    return leftTime - rightTime;
  }

  if (NUMBER_SORT_FIELDS.has(sortBy)) {
    const leftNum = typeof left === 'number' ? left : Number(left);
    const rightNum = typeof right === 'number' ? right : Number(right);
    if (!Number.isFinite(leftNum) && !Number.isFinite(rightNum)) return 0;
    if (!Number.isFinite(leftNum)) return 1;
    if (!Number.isFinite(rightNum)) return -1;
    return leftNum - rightNum;
  }

  return String(left).localeCompare(String(right), undefined, {
    sensitivity: 'base',
  });
}

/**
 * Sort lane page-1 candidates to match backend lane sort after SSE overlays.
 */
export function sortCandidatesForLane(
  candidates: Candidate[],
  sortBy: string,
  sortOrder: 'asc' | 'desc',
): Candidate[] {
  const direction = sortOrder === 'asc' ? 1 : -1;
  return [...candidates].sort((left, right) => {
    const valueCompare = compareSortValues(
      getNestedCandidateValue(left, sortBy),
      getNestedCandidateValue(right, sortBy),
      sortBy,
    );
    if (valueCompare !== 0) return valueCompare * direction;
    return String(left._id).localeCompare(String(right._id)) * direction;
  });
}
