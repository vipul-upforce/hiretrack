import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter } from 'lucide-react';
import { NotificationType } from '@/lib/models/notification';

interface NotificationsFiltersProps {
  filterType: string;
  setFilterType: (val: string) => void;
  filterRead: string;
  setFilterRead: (val: string) => void;
  filterPriority: string;
  setFilterPriority: (val: string) => void;
  availableTypes: NotificationType[];
  onClearFilters: () => void;
}

export function NotificationsFilters({
  filterType,
  setFilterType,
  filterRead,
  setFilterRead,
  filterPriority,
  setFilterPriority,
  availableTypes,
  onClearFilters,
}: NotificationsFiltersProps) {
  const hasActiveFilters =
    filterType !== 'all' || filterRead !== 'all' || filterPriority !== 'all';

  return (
    <div className="flex-shrink-0 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
      <div className="flex flex-col items-end gap-4 sm:flex-row">
        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {availableTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={filterRead} onValueChange={setFilterRead}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Priority</label>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="h-9"
          >
            <Filter className="mr-2 h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
