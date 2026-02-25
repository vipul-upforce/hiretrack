import { ILaneConfig } from '@/lib/models/JobLaneConfig';
import { Candidate } from '@/types/candidate';

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

// --- 1. Define Context Interface ---
// This defines what data the static row renderer needs access to
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
  onDeferStatusToChecklist?: (validationInfo: string, newStatus: string) => void;
  onOpenChecklistAfterSave?: (validationInfo: string) => void;
  /** When dragging multiple selected candidates: hide others, show count on held card */
  bulkDrag?: {
    isBulkDrag: boolean;
    draggedId: string | null;
    bulkIds: string[];
  } | undefined;
}

export interface KanbanColumnProps {
  column: {
    id: string;
    title: string;
    candidates: Candidate[];
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
  onDeferStatusToChecklist?: (validationInfo: string, newStatus: string) => void;
  onOpenChecklistAfterSave?: (validationInfo: string) => void;
  bulkDragState?: {
    isBulkDrag: boolean;
    draggedId: string | null;
    bulkIds: string[];
  };
}
