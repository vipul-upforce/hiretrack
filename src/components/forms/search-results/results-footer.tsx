'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { memo, useCallback } from 'react';

interface ResultsFooterProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  currentPageLimit: number;
  onLimitChange: (limit: number) => void;
  isLoading: boolean;
  filteredCount: number;
  totalCount: number;
  activeFilters: string[];
}

export const ResultsFooter = memo(({
  totalPages,
  currentPage,
  onPageChange,
  currentPageLimit,
  onLimitChange,
  isLoading,
  filteredCount,
  totalCount,
  activeFilters,
}: ResultsFooterProps) => {
  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, onPageChange]);

  const handleLimitChange = useCallback(
    (value: string) => {
      onLimitChange(Number(value));
    },
    [onLimitChange],
  );

  if (totalPages === 0) return null;

  return (
    <div className="p-4 border-t bg-muted/30">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Result Count */}
        <div className="text-sm text-muted-foreground">
          {activeFilters.length > 0 ? (
            <>
              Showing
              {' '}
              <span className="font-medium text-foreground">
                {filteredCount}
              </span>
              {' '}
              of
              {' '}
              <span className="font-medium text-foreground">{totalCount}</span>
              {' '}
              results
              {activeFilters.length > 0 && (
                <span className="ml-2">
                  (filtered by:
                  {' '}
                  {activeFilters
                    .map((f) => f
                      .replace('-', ' ')
                      .replace(/([A-Z])/g, ' $1')
                      .trim())
                    .join(', ')}
                  )
                </span>
              )}
            </>
          ) : (
            <>
              Showing
              {' '}
              <span className="font-medium text-foreground">
                {filteredCount}
              </span>
              {' '}
              of
              {' '}
              <span className="font-medium text-foreground">{totalCount}</span>
              {' '}
              results
            </>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1 || isLoading}
              onClick={handlePrevPage}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page
              {' '}
              {currentPage}
              {' '}
              of
              {' '}
              {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages || isLoading}
              onClick={handleNextPage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Select
            value={String(currentPageLimit)}
            onValueChange={handleLimitChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-[100px] text-sm">
              <SelectValue placeholder="Items per page" />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((limit) => (
                <SelectItem key={limit} value={String(limit)}>
                  {limit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
});

ResultsFooter.displayName = 'ResultsFooter';
