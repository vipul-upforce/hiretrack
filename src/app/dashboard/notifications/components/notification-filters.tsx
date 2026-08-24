import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarCheck,
  CheckCircle,
  FilePlus,
  Filter,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
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

  const quickTypeOptions = [
    {
      type: NotificationType.NEW_APPLICATIONS,
      label: 'New application',
      icon: FilePlus,
    },
    {
      type: NotificationType.NEW_REMARKS,
      label: 'Remarks',
      icon: MessageSquare,
    },
    {
      type: NotificationType.INTERVIEW_COMPLETED,
      label: 'Interview completed',
      icon: CheckCircle,
    },
    {
      type: NotificationType.MEETING_SCHEDULED,
      label: 'Meeting scheduled',
      icon: CalendarCheck,
    },
  ];

  const quickTypeValues = new Set(quickTypeOptions.map((item) => item.type));
  const otherTypes = availableTypes.filter(
    (type) => !quickTypeValues.has(type),
  );

  const formatTypeLabel = (type: string) =>
    type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  const selectValue = otherTypes.includes(filterType as NotificationType)
    ? filterType
    : 'all';

  return (
    <div className="flex-shrink-0 border-b border-gray-200 bg-gradient-to-b from-muted/30 to-transparent px-4 py-4 dark:border-gray-700">
      <div className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Quick filters
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={filterType === 'all' ? 'primary' : 'outline'}
                onClick={() => setFilterType('all')}
                className="h-9"
              >
                All
              </Button>
              {quickTypeOptions.map((item) => {
                const Icon = item.icon;
                const isActive = filterType === item.type;
                return (
                  <Button
                    key={item.type}
                    type="button"
                    size="sm"
                    variant={isActive ? 'primary' : 'outline'}
                    onClick={() =>
                      setFilterType(isActive ? 'all' : item.type)
                    }
                    className="h-9 gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {/* Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">More types</label>
              <Select
                value={selectValue}
                onValueChange={(value) => setFilterType(value)}
              >
                <SelectTrigger className="h-9 min-w-[180px]">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {otherTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {formatTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filterRead} onValueChange={setFilterRead}>
                <SelectTrigger className="h-9 min-w-[140px]">
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
                <SelectTrigger className="h-9 min-w-[140px]">
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
    </div>
  );
}
