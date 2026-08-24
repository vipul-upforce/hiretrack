'use client';

import { useState, useCallback, useEffect, ReactNode } from 'react';
import {
  MoreVertical,
  Edit,
  Trash2,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  X,
  ClipboardCheck,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/hooks/useAuth';

interface LaneOptionsMenuProps {
  laneId: string;
  laneName: string;
  onEdit: (id: string) => void;
  onSort: (field: string, direction: 'asc' | 'desc') => void;
  handleDeleteLane: () => void;
  setLaneToDelete: (laneId: string) => void;
  setLaneToEdit: (laneId: string) => void;
  onConfigureChecklist?: (laneId: string, laneName: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  sorting?: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }; // Current sorting from API response
}

interface MenuItemProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}

interface SortField {
  label: string;
  value: string;
}

function MenuItem({ icon, label, onClick, className = '' }: MenuItemProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center justify-between px-2 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none dark:hover:bg-gray-700 dark:focus:bg-gray-700',
        className,
      )}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

const SORT_FIELDS: SortField[] = [
  { label: 'Date Created', value: 'createdAt' },
  { label: 'Last Modified Date', value: 'lastModified' },
  { label: 'Assignment Date', value: 'assignmentDate' },
  { label: 'Experience', value: 'experience' },
  { label: 'Overall AI Score', value: 'aiScore' },
  { label: 'Current CTC', value: 'ctc' },
  { label: 'Expected CTC', value: 'expectedCtc' },
  { label: 'Notice Period', value: 'noticePeriod' },
  { label: 'Name ', value: 'name' },
];

// Map API sort field names back to frontend field names
const mapApiFieldToFrontend = (apiField: string): string => {
  const fieldMap: Record<string, string> = {
    'tracking.createdAt': 'createdAt',
    'tracking.updatedAt': 'lastModified',
    'assignment.assignedAt': 'assignmentDate',
    experience: 'experience',
    currentCTC: 'ctc',
    expectedCTC: 'expectedCtc',
    noticePeriod: 'noticePeriod',
    'scores.overall': 'aiScore',
    name: 'name',
    email: 'email',
    'followUp.date': 'followupDate',
  };
  return fieldMap[apiField] || apiField;
};

export function LaneOptionsMenu({
  laneId,
  laneName,
  handleDeleteLane,
  setLaneToDelete,
  setLaneToEdit,
  onEdit,
  onSort,
  onConfigureChecklist,
  isOpen,
  setIsOpen,
  sorting,
}: LaneOptionsMenuProps) {
  const { userRole } = useAuth();
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Initialize from API response sorting, fallback to default
  const getInitialSortField = (): string => {
    if (sorting?.sortBy) {
      return mapApiFieldToFrontend(sorting.sortBy);
    }
    return 'createdAt';
  };

  const getInitialSortDirection = (): 'asc' | 'desc' => {
    if (sorting?.sortOrder) {
      return sorting.sortOrder;
    }
    return 'asc';
  };

  const [selectedSortField, setSelectedSortField] = useState<string>(
    getInitialSortField,
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    getInitialSortDirection,
  );

  // Update state when API sorting changes
  useEffect(() => {
    if (sorting?.sortBy) {
      const frontendField = mapApiFieldToFrontend(sorting.sortBy);
      setSelectedSortField(frontendField);
      setSortDirection(sorting.sortOrder);
    }
  }, [sorting]);

  const handleSortFieldSelect = useCallback(
    (field: string) => {
      setSelectedSortField(field);
      // Trigger onSort when field is selected
      onSort(field, sortDirection);
    },
    [sortDirection, onSort],
  );

  const handleSortDirection = useCallback(
    (direction: 'asc' | 'desc') => {
      setSortDirection(direction);
      // Trigger onSort when direction is changed
      onSort(selectedSortField, direction);
    },
    [selectedSortField, onSort],
  );

  const menuItems = [
    {
      icon: <Edit className="mr-2 h-4 w-4" />,
      label: 'Edit',
      onClick: () => {
        onEdit(laneId);
        setLaneToEdit(laneId);
        setIsOpen(false);
      },
    },
    ...(onConfigureChecklist && userRole !== 'hr'
      ? [
          {
            icon: <ClipboardCheck className="mr-2 h-4 w-4" />,
            label: 'Checklists',
            onClick: () => {
              onConfigureChecklist(laneId, laneName);
              setIsOpen(false);
            },
          },
        ]
      : []),
    {
      icon: <ArrowUpDown className="mr-2 h-4 w-4" />,
      label: 'Sort',
      onClick: () => {
        setShowSortMenu(!showSortMenu);
      },
    },
    {
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      label: 'Delete',
      onClick: () => {
        handleDeleteLane();
        setLaneToDelete(laneId);
        setIsOpen(false);
      },
    },
  ];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'overflow-x-visible rounded-full p-1.5 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:hover:bg-gray-700 dark:focus:ring-gray-600',
          isOpen ? 'bg-gray-200 dark:bg-gray-700' : '',
        )}
      >
        <Button
          onClick={() => setShowSortMenu(false)}
          variant="ghost"
          size="icon"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 overflow-visible">
        <>
          {menuItems.map((item, index) => (
            <div key={item.label}>
              {index > 0 && <DropdownMenuSeparator />}
              <MenuItem
                icon={item.icon}
                label={item.label}
                onClick={item.onClick}
              />
            </div>
          ))}
        </>
        {showSortMenu && (
          <div className="animate-fade-in-right border-1 sort-menu absolute top-0 w-64 overflow-x-hidden rounded-lg border bg-white p-4 pb-0 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <span className="ml-2 font-thin text-gray-900 dark:text-gray-400">
                Sort Candidates by
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="ml-2"
                onClick={() => setShowSortMenu(false)}
                aria-label="Back to main menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
              {SORT_FIELDS.map((field) => (
                <button
                  type="button"
                  key={field.value}
                  className={cn(
                    'flex items-center justify-between rounded px-2 py-1 text-left text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                    selectedSortField === field.value
                      ? 'bg-gray-100 font-semibold dark:bg-gray-800'
                      : '',
                  )}
                  onClick={() => {
                    handleSortFieldSelect(field.value);
                  }}
                  aria-pressed={selectedSortField === field.value}
                >
                  <span>{field.label}</span>
                  {sortDirection === 'asc' &&
                    field.value === selectedSortField && (
                      <Button
                        className="h-8 w-8 rounded-full border bg-white hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSortDirection('desc');
                        }}
                        aria-pressed={sortDirection === 'asc'}
                      >
                        <SortAsc />
                      </Button>
                    )}
                  {sortDirection === 'desc' &&
                    field.value === selectedSortField && (
                      <Button
                        className="h-8 w-8 rounded-full bg-white hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSortDirection('asc');
                        }}
                        aria-pressed={sortDirection === 'desc'}
                      >
                        <SortDesc />
                      </Button>
                    )}
                </button>
              ))}
            </div>
            <div className="mb-4" />
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
