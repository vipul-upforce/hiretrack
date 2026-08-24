import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Bell, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SortConfig, SortField } from '../hooks/useDashboardState';

/** Label mappings for sort field display */
const SORT_FIELD_LABELS: Record<SortField, string> = {
  'assignment.time': 'Interview Date',
  'name': 'Candidate Name',
  'createdAt': 'Created Date',
  'jobId.title': 'Job Title',
};

interface DashboardHeaderProps {
  searchText: string;
  onSearchTextChange: (value: string) => void;
  onApplyFilter: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedAssignedTo: string;
  setSelectedAssignedTo: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  showRecentActivities: boolean;
  isActivitiesSidebarOpen: boolean;
  onToggleSidebar: () => void;
  userRole?: string;
  sortConfig: SortConfig;
  setSortConfig: React.Dispatch<React.SetStateAction<SortConfig>>;
  showHrSectionToggle?: boolean;
  isHrSectionEnabled?: boolean;
  onToggleHrSection?: (enabled: boolean) => void;
}

export function DashboardHeader({
  searchText,
  onSearchTextChange,
  onApplyFilter,
  open,
  setOpen,
  selectedAssignedTo,
  setSelectedAssignedTo,
  options,
  showRecentActivities,
  isActivitiesSidebarOpen,
  onToggleSidebar,
  userRole,
  sortConfig,
  setSortConfig,
  showHrSectionToggle = false,
  isHrSectionEnabled = true,
  onToggleHrSection,
}: DashboardHeaderProps) {
  const handleSortFieldChange = (field: string) => {
    setSortConfig((prev) => ({ ...prev, field: field as SortField }));
  };

  const toggleSortOrder = () => {
    setSortConfig((prev) => ({
      ...prev,
      order: prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };
  return (
    <div className="flex-shrink-0 border-b border-gray-200 px-4 pb-2 dark:border-gray-700">
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="flex flex-col gap-y-2 px-0 py-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="line-clamp-1 text-xl font-bold md:mr-2">
            All Assignments
          </CardTitle>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search assignments..."
                value={searchText}
                onChange={(e) => {
                  let { value } = e.target;
                  value = value.replace(/[/\\*+?|{}[\]()^$]/g, '');
                  value = value.replace(/\s{2,}/g, ' ');
                  if (value.length > 1) value = value.trimStart();
                  onSearchTextChange(value);
                }}
                className="w-96 max-w-lg"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    onApplyFilter();
                  }
                }}
              />
              <Button variant="secondary" onClick={onApplyFilter}>
                <Search className="mr-2 h-4 w-4" />
                Apply
              </Button>
              {(userRole === 'admin' || userRole === 'hr') && (
                <MultiSelect
                  placeholder="Assigned to"
                  open={open}
                  setOpen={setOpen}
                  value={selectedAssignedTo}
                  setValue={setSelectedAssignedTo}
                  options={options}
                />
              )}
              {/* Sort Controls */}
              <div className="flex items-center gap-1">
                <Select
                  value={sortConfig.field}
                  onValueChange={handleSortFieldChange}
                >
                  <SelectTrigger className="w-[160px]">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SORT_FIELD_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleSortOrder}
                  title={sortConfig.order === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {sortConfig.order === 'asc' ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {showHrSectionToggle && (
                <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background/80 px-2 py-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    My Assignments
                  </span>
                  <Switch
                    checked={isHrSectionEnabled}
                    onCheckedChange={(checked) => onToggleHrSection?.(checked)}
                  />
                </div>
              )}
              {showRecentActivities && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleSidebar}
                  className="ml-2"
                  title={
                    isActivitiesSidebarOpen
                      ? 'Hide notifications'
                      : 'Show notifications'
                  }
                >
                  <Bell className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

