'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export type EventType =
  | 'interviews'
  | 'screenings'
  | 'followups'
  | 'assignments'
  | 'assessments'
  | 'offers';

interface EventFiltersProps {
  selectedFilters: EventType[];
  onFilterChange: (filters: EventType[]) => void;
}

const filterOptions: { value: EventType; label: string; color: string }[] = [
  { value: 'interviews', label: 'Interviews', color: 'bg-blue-500' },
  { value: 'screenings', label: 'Screenings', color: 'bg-green-500' },
  { value: 'followups', label: 'Follow-ups', color: 'bg-purple-500' },
  { value: 'assignments', label: 'Assignments', color: 'bg-teal-500' },
  { value: 'assessments', label: 'Assessments', color: 'bg-pink-500' },
  { value: 'offers', label: 'Offers', color: 'bg-orange-500' },
];

export function EventFilters({ selectedFilters, onFilterChange }: EventFiltersProps) {
  const handleFilterToggle = (filterValue: EventType) => {
    const newFilters = selectedFilters.includes(filterValue)
      ? selectedFilters.filter((f) => f !== filterValue)
      : [...selectedFilters, filterValue];
    onFilterChange(newFilters);
  };

  return (
    <div className="space-y-3">
      {filterOptions.map((option) => (
        <div key={option.value} className="flex items-center space-x-2">
          <Checkbox
            id={option.value}
            checked={selectedFilters.includes(option.value)}
            onCheckedChange={() => handleFilterToggle(option.value)}
          />
          <div className="flex items-center gap-2 flex-1">
            <div className={`w-3 h-3 rounded-full ${option.color}`} />
            <Label
              htmlFor={option.value}
              className="text-sm font-normal cursor-pointer"
            >
              {option.label}
            </Label>
          </div>
        </div>
      ))}
    </div>
  );
}
