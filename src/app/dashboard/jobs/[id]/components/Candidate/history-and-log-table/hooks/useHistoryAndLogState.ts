import { useState } from 'react';

/**
 * Manages toggle state for switching between history timeline and logs table
 * @returns Object containing showLogTable state and setter
 */
export function useHistoryAndLogState() {
  const [showLogTable, setShowLogTable] = useState(false);

  return {
    showLogTable,
    setShowLogTable,
  };
}

