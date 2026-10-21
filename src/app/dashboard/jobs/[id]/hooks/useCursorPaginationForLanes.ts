import { useEffect, useState } from 'react';

const STORAGE_KEY = 'hiretrack:feature:useCursorPaginationForLanes';

/**
 * Feature flag for lane cursor pagination.
 *
 * Precedence:
 * - localStorage value (true/false) if present
 * - env default (`NEXT_PUBLIC_USE_CURSOR_PAGINATION_LANES`)
 */
export function useCursorPaginationForLanes(): boolean {
  // Default ON (cursor everywhere). Allow explicit opt-out for troubleshooting.
  // Set env `NEXT_PUBLIC_USE_CURSOR_PAGINATION_LANES=false` or localStorage `"false"` to disable.
  const envEnabled =
    process.env.NEXT_PUBLIC_USE_CURSOR_PAGINATION_LANES !== 'false';
  const [enabled, setEnabled] = useState<boolean>(envEnabled);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'false') setEnabled(false);
    else setEnabled(envEnabled);
  }, [envEnabled]);

  return enabled;
}
