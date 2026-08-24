import { useState } from 'react';

interface UseEntryOptionsReturn {
  isRemarkOptionsOpen: boolean;
  isRemarkOpsOpenFor: string | null;
  isNoteOpsOpenFor: string | null;
  setIsRemarkOptionsOpen: (open: boolean) => void;
  setIsRemarkOpsOpenFor: (id: string | null) => void;
  setIsNoteOpsOpenFor: (id: string | null) => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
}

/**
 * Hook to manage remark/note options menu state
 */
export function useEntryOptions(): UseEntryOptionsReturn {
  const [isRemarkOptionsOpen, setIsRemarkOptionsOpen] = useState(false);
  const [isRemarkOpsOpenFor, setIsRemarkOpsOpenFor] = useState<string | null>();
  const [isNoteOpsOpenFor, setIsNoteOpsOpenFor] = useState<string | null>();

  const handleMouseEnter = () => {
    setIsRemarkOptionsOpen(true);
  };

  const handleMouseLeave = () => {
    setIsRemarkOptionsOpen(false);
  };

  return {
    isRemarkOptionsOpen,
    isRemarkOpsOpenFor: isRemarkOpsOpenFor || null,
    isNoteOpsOpenFor: isNoteOpsOpenFor || null,
    setIsRemarkOptionsOpen,
    setIsRemarkOpsOpenFor,
    setIsNoteOpsOpenFor,
    handleMouseEnter,
    handleMouseLeave,
  };
}
