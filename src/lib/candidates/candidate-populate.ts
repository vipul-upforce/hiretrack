/**
 * Shared Mongoose populate options for candidate reads/broadcasts.
 * Resolves Lane ObjectId refs to lowercase lane names for API/SSE clients.
 */
export const candidateStatusLaneNamePopulate = {
  path: 'status' as const,
  select: 'name',
  transform: (status: { name?: string } | null) =>
    status?.name?.toLowerCase() ?? null,
};

export const candidateBroadcastPopulate = [
  { path: 'assignment.interviewerId', select: '_id name email' },
  { path: 'remarks.userId', select: 'name email' },
  { path: 'followUp.userId', select: '_id name email' },
  { path: 'jobId', select: 'title description' },
  candidateStatusLaneNamePopulate,
];
