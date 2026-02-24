import { useState, useCallback } from 'react';
import { IChecklist, IJobLaneConfig } from '@/lib/models/JobLaneConfig';
import { useValidateCandidateChecklistMutation } from '@/lib/features/checklist/checklistApi';
import logger from '@/lib/logger';

interface PrevalidatedChecklist {
  laneId: string;
  type: 'incoming' | 'outgoing';
  checklist: IChecklist;
  isMandatory: boolean;
  canMove: boolean;
}

interface PrevalidationCache {
  [key: string]: PrevalidatedChecklist;
}

export const useChecklistPrevalidation = (
  jobLaneConfig: IJobLaneConfig | undefined,
) => {
  const [prevalidationCache, setPrevalidationCache] =
    useState<PrevalidationCache>({});
  const [validateChecklist] = useValidateCandidateChecklistMutation();

  // Helper to get checklist config from lane config
  const getChecklistFromLaneConfig = useCallback(
    (laneId: string, type: 'incoming' | 'outgoing') => {
      if (!jobLaneConfig) return null;

      const laneConfig = jobLaneConfig.laneConfigs.find(
        (config) => config.laneId === laneId,
      );
      if (!laneConfig) return null;

      return type === 'incoming'
        ? laneConfig.incomingChecklist
        : laneConfig.outgoingChecklist;
    },
    [jobLaneConfig],
  );

  // Check if lane has checklist without API call
  const hasChecklist = useCallback(
    (laneId: string, type: 'incoming' | 'outgoing') =>
      !!getChecklistFromLaneConfig(laneId, type),
    [getChecklistFromLaneConfig],
  );

  // Pre-validate a single checklist
  const prevalidateSingle = useCallback(
    async (
      candidateId: string,
      currentLane: string,
      targetLane: string,
      movementType: 'incoming' | 'outgoing',
    ) => {
      const cacheKey = `${candidateId}-${currentLane}-${targetLane}-${movementType}`;

      // Return cached result if available
      if (prevalidationCache[cacheKey]) {
        return prevalidationCache[cacheKey];
      }

      try {
        const validation = await validateChecklist({
          candidateId,
          currentLane,
          targetLane,
          movementType,
        }).unwrap();

        if (!validation.checklist) {
          logger.error('No checklist found for validation');
          return null;
        }

        const result: PrevalidatedChecklist = {
          laneId: movementType === 'incoming' ? targetLane : currentLane,
          type: movementType,
          checklist: validation.checklist,
          isMandatory: validation.isMandatory || false,
          canMove: validation.canMove,
        };

        // Cache the result
        setPrevalidationCache((prev) => ({
          ...prev,
          [cacheKey]: result,
        }));

        return result;
      } catch {
        return null;
      }
    },
    [validateChecklist, prevalidationCache],
  );

  // Pre-validate all possible moves for a candidate
  const prevalidateCandidate = useCallback(
    async (
      candidateId: string,
      currentLaneId: string,
      allLaneIds: string[],
    ) => {
      if (!jobLaneConfig) return;

      const validationPromises: Promise<PrevalidatedChecklist | null>[] = [];

      // Check outgoing from current lane (only if it has an outgoing checklist)
      if (hasChecklist(currentLaneId, 'outgoing')) {
        allLaneIds.forEach((targetLaneId) => {
          if (targetLaneId !== currentLaneId) {
            validationPromises.push(
              prevalidateSingle(
                candidateId,
                currentLaneId,
                targetLaneId,
                'outgoing',
              ).catch((err) => {
                logger.error('Prevalidation error:', err);
                return null;
              }),
            );
          }
        });
      }

      // Check incoming to lanes that have incoming checklists
      allLaneIds.forEach((targetLaneId) => {
        if (
          targetLaneId !== currentLaneId &&
          hasChecklist(targetLaneId, 'incoming')
        ) {
          validationPromises.push(
            prevalidateSingle(
              candidateId,
              currentLaneId,
              targetLaneId,
              'incoming',
            ).catch((err) => {
              logger.error('Prevalidation error:', err);
              return null;
            }),
          );
        }
      });

      // Execute validations with a timeout to prevent blocking
      if (validationPromises.length > 0) {
        try {
          await Promise.race([
            Promise.all(validationPromises),
            new Promise<void>((resolve) => {
              setTimeout(resolve, 2000);
            }), // 2 second timeout
          ]);
        } catch (error) {
          logger.error('Prevalidation timeout or error:', error);
        }
      }
    },
    [jobLaneConfig, hasChecklist, prevalidateSingle],
  );

  // Get cached validation result
  const getCachedValidation = useCallback(
    (
      candidateId: string,
      currentLane: string,
      targetLane: string,
      movementType: 'incoming' | 'outgoing',
    ) => {
      const cacheKey = `${candidateId}-${currentLane}-${targetLane}-${movementType}`;
      return prevalidationCache[cacheKey] || null;
    },
    [prevalidationCache],
  );

  // Clear cache for a specific candidate
  const clearCandidateCache = useCallback((candidateId: string) => {
    setPrevalidationCache((prev) => {
      const newCache = { ...prev };
      Object.keys(newCache).forEach((key) => {
        if (key.startsWith(candidateId)) {
          delete newCache[key];
        }
      });
      return newCache;
    });
  }, []);

  return {
    prevalidateCandidate,
    getCachedValidation,
    clearCandidateCache,
    hasChecklist,
    getChecklistFromLaneConfig,
  };
};
