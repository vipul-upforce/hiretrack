import { useMemo } from 'react';
import { IChecklist, IJobLaneConfig } from '@/lib/models/JobLaneConfig';
import { Candidate } from '@/types/candidate';
import {
  filterChecklistByRole,
  getUserRole,
} from '@/lib/utils/checklistVisibility';

interface ChecklistValidationResult {
  canMove: boolean;
  requiresChecklist: boolean;
  checklist?: IChecklist;
  isMandatory: boolean;
  checklistCompleted: boolean;
  message?: string;
}

export const useClientSideChecklistValidation = (
  jobLaneConfig: IJobLaneConfig | undefined,
  userRole: string | undefined,
) => {
  const validateMovement = useMemo(
    () =>
      (
        candidate: Candidate,
        currentLaneId: string,
        targetLaneId: string,
        movementType: 'incoming' | 'outgoing',
      ): ChecklistValidationResult => {
        // If no lane config, allow movement
        if (!jobLaneConfig) {
          return {
            canMove: true,
            requiresChecklist: false,
            isMandatory: false,
            checklistCompleted: false,
          };
        }

        // Get the relevant lane configuration (case-insensitive: status may not match laneId casing)
        const laneId =
          movementType === 'incoming' ? targetLaneId : currentLaneId;
        const laneConfig = jobLaneConfig.laneConfigs.find(
          (lc) =>
            lc.laneId.toLowerCase() === laneId.toLowerCase() ||
            (lc.laneName?.toLowerCase() === laneId.toLowerCase()),
        );

        if (!laneConfig) {
          return {
            canMove: true,
            requiresChecklist: false,
            isMandatory: false,
            checklistCompleted: false,
          };
        }

        const configLaneId = laneConfig.laneId;

        // Get the checklist
        const checklist =
          movementType === 'incoming'
            ? laneConfig.incomingChecklist
            : laneConfig.outgoingChecklist;

        if (!checklist) {
          return {
            canMove: true,
            requiresChecklist: false,
            isMandatory: false,
            checklistCompleted: false,
          };
        }

        // Filter checklist based on user role
        const role = getUserRole(userRole);
        if (!role) {
          return {
            canMove: false,
            requiresChecklist: false,
            isMandatory: false,
            checklistCompleted: false,
            message: 'Invalid user role',
          };
        }

        const filteredChecklist = filterChecklistByRole(
          checklist,
          role,
          'form',
        );

        // If no fields are visible to this user, skip checklist entirely
        if (!filteredChecklist) {
          return {
            canMove: true,
            requiresChecklist: false,
            isMandatory: false,
            checklistCompleted: false,
            message: 'No checklist fields visible to current user role',
          };
        }

        // Check if checklist is already completed (backend keys by config laneId)
        const candidateChecklistData = candidate.checklistData?.[configLaneId];
        const checklistData =
          movementType === 'incoming'
            ? candidateChecklistData?.incoming
            : candidateChecklistData?.outgoing;

        const isCompleted =
          checklistData && checklistData.checklistId === checklist.id;

        if (isCompleted) {
          return {
            canMove: true,
            requiresChecklist: false,
            isMandatory: checklist.isMandatory || false,
            checklistCompleted: true,
          };
        }

        // Even if mandatory, allow movement but show checklist dialog
        if (checklist.isMandatory) {
          return {
            canMove: true,
            requiresChecklist: true,
            checklist: filteredChecklist,
            isMandatory: true,
            checklistCompleted: false,
            message:
              'This checklist must be completed before moving the candidate',
          };
        }

        // Optional checklist - allow movement but show checklist
        return {
          canMove: true,
          requiresChecklist: true,
          checklist: filteredChecklist,
          isMandatory: false,
          checklistCompleted: false,
        };
      },
    [jobLaneConfig, userRole],
  );

  // Validate a complete movement (both outgoing and incoming)
  const validateCompleteMovement = useMemo(
    () =>
      (candidate: Candidate, currentLaneId: string, targetLaneId: string) => {
        // Check outgoing first
        const outgoingValidation = validateMovement(
          candidate,
          currentLaneId,
          targetLaneId,
          'outgoing',
        );

        if (!outgoingValidation.canMove) {
          return {
            validation: outgoingValidation,
            type: 'outgoing' as const,
          };
        }

        // If outgoing allows movement, check incoming
        const incomingValidation = validateMovement(
          candidate,
          currentLaneId,
          targetLaneId,
          'incoming',
        );

        if (!incomingValidation.canMove) {
          return {
            validation: incomingValidation,
            type: 'incoming' as const,
          };
        }

        // Both allow movement - check if both require checklists
        if (
          outgoingValidation.requiresChecklist &&
          incomingValidation.requiresChecklist
        ) {
          // Return outgoing first, with incoming as pending
          return {
            validation: outgoingValidation,
            type: 'outgoing' as const,
            pendingValidation: incomingValidation,
            pendingType: 'incoming' as const,
          };
        }

        // Only outgoing requires checklist
        if (outgoingValidation.requiresChecklist) {
          return {
            validation: outgoingValidation,
            type: 'outgoing' as const,
          };
        }

        // Only incoming requires checklist
        if (incomingValidation.requiresChecklist) {
          return {
            validation: incomingValidation,
            type: 'incoming' as const,
          };
        }

        // No checklist required
        return {
          validation: {
            canMove: true,
            requiresChecklist: false,
            isMandatory: false,
            // checklist: [],
            checklistCompleted: false,
          },
          type: null,
        };
      },
    [validateMovement],
  );

  /** Returns validation to show mandatory outgoing for a source lane (config-only, ignores candidate completion). Use as safety net when drag would otherwise skip checklist. */
  const getMandatoryOutgoingForLane = useMemo(
    () =>
      (sourceLaneId: string): ChecklistValidationResult | null => {
        if (!jobLaneConfig) return null;
        const laneConfig = jobLaneConfig.laneConfigs.find(
          (lc) =>
            lc.laneId.toLowerCase() === sourceLaneId.toLowerCase() ||
            (lc.laneName?.toLowerCase() === sourceLaneId.toLowerCase()),
        );
        if (!laneConfig?.outgoingChecklist?.isMandatory) return null;
        const role = getUserRole(userRole);
        if (!role) return null;
        const filteredChecklist = filterChecklistByRole(
          laneConfig.outgoingChecklist,
          role,
          'form',
        );
        if (!filteredChecklist) return null;
        return {
          canMove: true,
          requiresChecklist: true,
          checklist: filteredChecklist,
          isMandatory: true,
          checklistCompleted: false,
        };
      },
    [jobLaneConfig, userRole],
  );

  return {
    validateMovement,
    validateCompleteMovement,
    getMandatoryOutgoingForLane,
  };
};
