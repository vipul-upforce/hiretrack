'use client';

import React, {
  createContext,
  useState,
  useContext,
  useMemo,
  useCallback,
} from 'react';
import { Candidate } from '@/types/candidate';
import { getJobId } from '@/app/dashboard/jobs/[id]/utils/candidateAccessors';

/**
 * Minimal global state: only whether the unified candidate action dialog is open
 * and for which job. Used solely to decide which job's checklist-config to load
 * (in useGlobalChecklistValidation). All other checklist validation state stays
 * in the hook / callers as before.
 */
export interface UnifiedDialogChecklistJobContextValue {
  /** When the unified dialog is open, the jobId it is open for; null when closed. */
  unifiedDialogJobId: string | null;
  setUnifiedDialogJobId: (jobId: string | null) => void;
}

const UnifiedDialogChecklistJobContext =
  createContext<UnifiedDialogChecklistJobContextValue | null>(null);

export function useUnifiedDialogChecklistJob(): UnifiedDialogChecklistJobContextValue | null {
  return useContext(UnifiedDialogChecklistJobContext);
}

export function useUnifiedDialogChecklistJobOrThrow(): UnifiedDialogChecklistJobContextValue {
  const ctx = useContext(UnifiedDialogChecklistJobContext);
  if (!ctx) {
    throw new Error(
      'useUnifiedDialogChecklistJobOrThrow must be used within UnifiedDialogChecklistJobProvider',
    );
  }
  return ctx;
}

export function UnifiedDialogChecklistJobProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [unifiedDialogJobId, setUnifiedDialogJobIdState] = useState<string | null>(null);

  const setUnifiedDialogJobId = useCallback((jobId: string | null) => {
    setUnifiedDialogJobIdState(jobId);
  }, []);

  const value = useMemo(
    () => ({ unifiedDialogJobId, setUnifiedDialogJobId }),
    [unifiedDialogJobId, setUnifiedDialogJobId],
  );

  return (
    <UnifiedDialogChecklistJobContext.Provider value={value}>
      {children}
    </UnifiedDialogChecklistJobContext.Provider>
  );
}

/** Call from UnifiedCandidateActionsDialog: set job when dialog opens, null when it closes. */
export function useSetUnifiedDialogChecklistJob(): (candidate: Candidate | null) => void {
  const ctx = useUnifiedDialogChecklistJobOrThrow();
  return useCallback(
    (candidate: Candidate | null) => {
      ctx.setUnifiedDialogJobId(candidate ? getJobId(candidate) ?? null : null);
    },
    [ctx],
  );
}
