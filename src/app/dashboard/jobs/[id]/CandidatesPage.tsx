'use client';

import { useState } from 'react';
import { ChevronDown, Filter, LayoutList, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function CandidatesPage() {
  const [view, setView] = useState<'board' | 'list'>('board');
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* All Jobs Dropdown */}
          <button
            type="button"
            className="flex items-center gap-2 rounded-md border px-4 py-2 shadow-sm"
          >
            <span>All Jobs (156)</span>
            <ChevronDown size={16} />
          </button>

          {/* View Toggle */}
          <div className="flex gap-1 rounded-md bg-muted p-1">
            <button
              type="button"
              onClick={() => setView('board')}
              className={cn(
                'flex items-center gap-1 rounded-md px-3 py-1 text-sm',
                view === 'board'
                  ? 'bg-white text-black shadow'
                  : 'text-muted-foreground',
              )}
            >
              <LayoutGrid size={16} />
              Board
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn(
                'flex items-center gap-1 rounded-md px-3 py-1 text-sm',
                view === 'list'
                  ? 'bg-white text-black shadow'
                  : 'text-muted-foreground',
              )}
            >
              <LayoutList size={16} />
              List
            </button>
          </div>
        </div>

        {/* Filter Button */}
        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-2 rounded-md border px-4 py-2 shadow-sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filters
          </button>

          {showFilters && (
            <div className="absolute right-0 z-10 mt-2 w-72 rounded-lg border bg-background p-4 shadow-lg">
              <h4 className="mb-2 font-medium">Filter Candidates</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Assigned To
                  </label>
                  <Select>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="All Assignees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assignees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    AI Score Range
                  </label>
                  <Select>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="All Scores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Scores</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Application Date
                  </label>
                  <Select>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Placeholder */}
      <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed text-gray-400">
        {view === 'board' ? 'Board View Content' : 'List View Content'}
      </div>
    </div>
  );
}
