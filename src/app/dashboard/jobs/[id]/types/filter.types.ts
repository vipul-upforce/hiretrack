export interface FilterState {
  search: string;
  logicalOperator: 'AND' | 'OR';
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  topCandidates: boolean;
  appliedThisWeek: boolean;
  appliedToday: boolean;
  appliedIn15Days: boolean;
  toFollowUp: boolean;
  assigned: boolean;
  notAssigned: boolean;
  withRemarks: boolean;
  withoutRemarks: boolean;
  isArchived: boolean;
}