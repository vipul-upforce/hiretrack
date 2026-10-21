import type { MutableRefObject } from 'react';
import { ILaneConfig } from '@/lib/models/JobLaneConfig';
import { Candidate } from '@/types/candidate';
import type { JobViewState } from '../../utils/jobViewStorage';

export // --- Types ---
interface PendingMove {
  candidateId: string;
  sourceLaneId: string;
  targetLaneId: string;
  sourceIndex: number;
  targetIndex: number;
}

export interface SortConfig {
  field: string | null;
  direction: 'asc' | 'desc';
  enabled: boolean;
}

/**
 * Request to refetch a lane.
 * - Status/drag: refetch page 1 and reset lane to page 1 (refetchCurrentPageOnly false/undefined).
 * - Other actions (tags, remark, delete, edit, etc.): refetchCurrentPageOnly true = refetch only current page and replace slice.
 */
export type LaneRefetchRequestItem = {
  laneId: string;
  candidateId?: string;
  updatedCandidate?: Candidate;
  timestamp?: number;
  refetchCurrentPageOnly?: boolean;
};
export type LaneRefetchRequest =
  | LaneRefetchRequestItem
  | LaneRefetchRequestItem[]
  | null;

// --- 1. Define Context Interface ---
// This defines what data the static row renderer needs access to
/** Status change / drag: reset lane(s) to page 1 and refetch. */
export type OnLaneRefetchColumn = (
  laneIdOrLanes: string | string[],
  candidateId?: string,
  updatedCandidate?: Candidate,
) => void;
/** Tags, remark, follow-up, delete, edit, assign, evaluate: refetch only that lane's current page. */
export type OnLaneRefetchCurrentPageColumn = (
  laneId: string,
  candidateId?: string,
  updatedCandidate?: Candidate,
) => void;

export interface CandidateContextType {
  laneId: string;
  pendingMoves: PendingMove[];
  refetch: () => void;
  openRemarksFor: string | null;
  setOpenRemarksFor: (id: string | null) => void;
  setSelectedCandidate: (candidate: Candidate | null) => void;
  handleDeleteClick: (id: string) => void;
  setIsDetailsOpen: (val: boolean) => void;
  /** Shift-click range selection: (candidate, index) => void */
  onSelectCandidate?: (candidate: Candidate, candidateIndex: number) => void;
  isShiftPressed?: boolean;
  /** Single-candidate status change: validate checklist; when required, defer to checklist dialog */
  onValidateStatusChange?: (
    candidate: Candidate,
    newStatus: string,
  ) => { requiresChecklist: boolean; validationInfo?: string } | null;
  onDeferStatusToChecklist?: (
    validationInfo: string,
    newStatus: string,
    nextChecklistValidationInfo?: string,
  ) => void;
  onOpenChecklistAfterSave?: (validationInfo: string) => void;
  bulkDrag?: {
    isBulkDrag: boolean;
    draggedId: string | null;
    bulkIds: string[];
  } | undefined;
  onUpdate?: (updatedCandidate: Candidate) => void;
  /** When status is updated from card's unified actions dialog, triggers lane refetch. */
  onLaneRefetch?: OnLaneRefetchColumn;
  /** Refetch only this lane's current page (tags, remark, delete, edit, etc.). */
  onLaneRefetchCurrentPage?: OnLaneRefetchCurrentPageColumn;
}

export interface KanbanColumnProps {
  column: {
    id: string;
    title: string;
    candidates: Candidate[];
    count?: number;
    hasMore?: boolean;
    pageInfo?: {
      hasNextPage: boolean;
      nextCursor: string | null;
    };
    sorting?: {
      sortBy: string;
      sortOrder: 'asc' | 'desc';
    };
    filters?: string[];
    /** Candidate IDs in another lane (SSE). Used to remove only moved-out candidates when merging page 1 + page 2+. */
    removedFromLaneIds?: string[];
    /** Per-lane count delta from SSE (e.g. -1 = one left). Cap removals to abs(delta) so we never remove more than left. */
    laneCountDelta?: number;
  };
  index: number;
  isFileOver: boolean;
  setIsFileOver: (value: boolean) => void;
  handleFileDrop: (file: File) => void;
  handleDeleteLane: () => void;
  handleEditLane: () => void;
  setLaneToDelete: (laneId: string) => void;
  setLaneToEdit: (laneId: string) => void;
  refetch: () => void;
  selectedCandidate: Candidate | null;
  setSelectedCandidate: (candidate: Candidate | null) => void;
  isDetailsOpen: boolean;
  setIsDetailsOpen: (value: boolean) => void;
  openRemarksFor: string | null;
  setOpenRemarksFor: (candidateId: string | null) => void;
  handleDeleteClick: (candidateId: string) => void;
  onConfigureChecklist?: (
    laneId: string,
    laneName: string,
    initialTab?: 'incoming' | 'outgoing',
  ) => void;
  isDragging?: boolean;
  pendingMoves?: PendingMove[];
  laneConfig?: ILaneConfig;
  onValidateStatusChange?: (
    candidate: Candidate,
    newStatus: string,
  ) => { requiresChecklist: boolean; validationInfo?: string } | null;
  onDeferStatusToChecklist?: (
    validationInfo: string,
    newStatus: string,
    nextChecklistValidationInfo?: string,
  ) => void;
  onOpenChecklistAfterSave?: (validationInfo: string) => void;
  laneMapping?: Record<string, string>; // Map lane name -> Lane ObjectId
  /** Registry of candidates currently visible in cursor lanes (page 2+ included). */
  kanbanVisibleCandidatesRef?: MutableRefObject<Map<string, Candidate>>;
  jobId: string;
  /** When set, this column refetches (single or array of lanes); with candidateId only that page is refetched. */
  laneToRefetch?: LaneRefetchRequest;
  /** Called after this column finishes a lane refetch; pass laneId when laneToRefetch is an array so parent can remove that lane from the queue. */
  onLaneRefetchDone?: (laneId?: string) => void;
  /** When set to this column's id, force reset to page 1 and show only page 1 (e.g. after migration into this lane). */
  resetLaneToPage1Id?: string | null;
  /** Called after this column has reset to page 1 (e.g. clear migration destination state). */
  onResetLaneDone?: (laneId: string) => void;
  /** When status is updated from unified actions dialog, call this so Kanban columns refetch affected lanes. */
  onLaneRefetch?: OnLaneRefetchColumn;
  /** Refetch only this lane's current page (tags, remark, delete, edit, assign, evaluate). */
  onLaneRefetchCurrentPage?: OnLaneRefetchCurrentPageColumn;
  /** View state (filter + sort) for lane API calls. */
  viewState?: JobViewState;
  /** Persist lane sort to localStorage. */
  setLaneSort?: (laneName: string, entry: { sortBy: string; sortOrder: number } | null) => void;
  /** When this key changes, reset lane to page 1 and show first page only (filter/sort changed). */
  resetAllLanesToPage1Key?: number;
  /**
   * When true, the lane should render strictly from API response (no cached local pages / SSE overlay).
   * This is used for deterministic UX on filter/sort changes.
   */
  strictApiOnly?: boolean;
  bulkDragState?: {
    isBulkDrag: boolean;
    draggedId: string | null;
    bulkIds: string[];
  };
  
}
