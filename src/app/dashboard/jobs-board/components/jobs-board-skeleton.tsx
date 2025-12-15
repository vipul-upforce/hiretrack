'use client';

import { useEffect, useState } from 'react';
import LoaderSkeleton from './loader-skeleton';
import { TableSkeleton } from './table-skeleton';

export default function JobsSkeleton() {
  const [view, setView] = useState<'board' | 'table'>('board');

  useEffect(() => {
    const mode = localStorage.getItem('jobs-board-view-mode') as
      | 'board'
      | 'table';
    if (mode) setView(mode);
  }, []);

  if (view === 'table') return <TableSkeleton />;
  return <LoaderSkeleton />;
}
