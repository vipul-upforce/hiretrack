import type { ChecklistSubmissionData, ChecklistRemark } from '@/types/checklist';
import type { ChecklistInfo } from '../types';

export interface BuildPayloadParams {
  parsedChecklistInfo: ChecklistInfo;
  laneName: string;
  responses: Record<string, import('@/types/checklist').ChecklistHistoryResponseItem>;
  remark?: {
    description: string;
    isPrivate: boolean;
    rating?: number;
  };
}

/**
 * Builds the checklist submission payload for API or bulk apply.
 * Centralizes laneId/laneName/checklistType logic.
 */
export function buildChecklistSubmissionPayload({
  parsedChecklistInfo,
  laneName,
  responses,
  remark,
}: BuildPayloadParams): ChecklistSubmissionData {
  const checklist = parsedChecklistInfo.checklist!;
  const checklistType =
    parsedChecklistInfo.checklistType === 'incoming' ||
    parsedChecklistInfo.checklistType === 'outgoing'
      ? parsedChecklistInfo.checklistType
      : 'outgoing';
  const laneId =
    parsedChecklistInfo.checklistType === 'incoming'
      ? parsedChecklistInfo.targetLane
      : parsedChecklistInfo.currentLane;

  const remarkPayload: ChecklistRemark | undefined = remark?.description?.trim()
    ? {
        description: remark.description.trim(),
        isPrivate: remark.isPrivate,
        rating: remark.rating ?? undefined,
      }
    : undefined;

  return {
    checklistId: checklist.id,
    checklistName: checklist.name,
    checklistType,
    laneId,
    laneName,
    responses,
    remark: remarkPayload,
  };
}
