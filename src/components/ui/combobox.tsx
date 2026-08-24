'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ComboboxProps {
  options: { value: string; label: string }[];
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  width?: string;
}

export function Combobox({
  options,
  placeholder = 'Select an option...',
  value,
  onValueChange,
  width = '200px',
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // Focus the input when the dropdown opens
  React.useEffect(() => {
    if (open && inputRef.current) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setSearch('');
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Filter options based on search input
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative" style={{ width }}>
      <Button
        type="button"
        ref={buttonRef}
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn('justify-between', 'w-full')}
        onClick={() => {
          setOpen(true);
        }}
      >
        {value
          ? options.find((option) => option.value === value)?.label
          : placeholder}
        <ChevronsUpDown className="opacity-50" />
      </Button>
      <div
        ref={dropdownRef}
        className={cn(
          'absolute left-0 top-full z-[999] mt-1 w-full rounded-md border bg-background shadow-lg transition-all duration-200 ease-in-out',
          open
            ? 'translate-y-0 transform opacity-100'
            : 'pointer-events-none -translate-y-2 transform opacity-0',
        )}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          className="h-9 w-full border-b border-accent bg-background px-3 py-2 text-sm outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()} // Prevent mousedown from closing dropdown
        />
        <div role="listbox" className="max-h-[200px] overflow-y-auto">
          {filteredOptions.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No option found.
            </div>
          )}
          {filteredOptions.map((option) => {
            const isSelected = value === option.value;
            const handleSelect = () => {
              onValueChange(option.value === value ? '' : option.value);
              setOpen(false);
              setSearch('');
            };
            return (
              <div
                key={option.value}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                className={cn(
                  'flex cursor-pointer items-center bg-accent px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                  isSelected
                    ? 'bg-accent font-medium text-accent-foreground hover:bg-accent'
                    : 'text-foreground',
                )}
                onClick={handleSelect}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect();
                  }
                }}
              >
                {option.label}
                <Check
                  className={cn(
                    'ml-auto h-4 w-4',
                    isSelected ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
