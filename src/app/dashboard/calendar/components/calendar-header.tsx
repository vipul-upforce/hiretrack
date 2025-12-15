'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Calendar as CalendarIcon } from 'lucide-react';
import { CalendarView } from '../types';

interface CalendarHeaderProps {
  searchText: string;
  onSearchTextChange: (text: string) => void;
  onApplyFilter: () => void;
  calendarView: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

export function CalendarHeader({
  searchText,
  onSearchTextChange,
  onApplyFilter,
  calendarView,
  onViewChange,
}: CalendarHeaderProps) {
  return (
    <div className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-black">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              type="text"
              placeholder="Search interviews..."
              value={searchText}
              onChange={(e) => onSearchTextChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  onApplyFilter();
                }
              }}
              className="pl-10 pr-10"
            />
            {searchText && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 transform p-0"
                onClick={() => {
                  onSearchTextChange('');
                  onApplyFilter();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button onClick={onApplyFilter} variant="secondary">
            <Search className="h-4 w-4 mr-2" />
            Apply
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-gray-500" />
          <div className="flex gap-1 rounded-md border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
            <Button
              variant={calendarView === 'dayGridMonth' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('dayGridMonth')}
            >
              Month
            </Button>
            <Button
              variant={calendarView === 'timeGridWeek' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('timeGridWeek')}
            >
              Week
            </Button>
            <Button
              variant={calendarView === 'timeGridDay' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('timeGridDay')}
            >
              Day
            </Button>
            <Button
              variant={calendarView === 'listWeek' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('listWeek')}
            >
              Agenda
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

