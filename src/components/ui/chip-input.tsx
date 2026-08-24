'use client';

import * as React from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ChipInputProps {
  value?: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
  onBlur?: () => void;
  fullWidth?: boolean;
  showAddButton?: boolean;
}

export function ChipInput({
  value = [],
  onChange,
  placeholder,
  suggestions = [],
  onSuggestionClick,
  onBlur,
  fullWidth,
  showAddButton = false,
}: ChipInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [selectedValues, setSelectedValues] = React.useState<string[]>([]);

  React.useEffect(() => {
    // if (value.length > 0) {
    if (typeof value === 'string') {
      setSelectedValues([value]);
    } else {
      setSelectedValues(value);
    }
    // }
  }, [value]);

  const handleUnselect = (item: string) => {
    const newValues = (selectedValues || []).filter((i) => i !== item);
    setSelectedValues(newValues);
    onChange(newValues);
  };

  const addSkill = (value2: string) => {
    const trimmedValue = value2.trim();
    const hasAlphanumeric = /[a-zA-Z0-9]/.test(trimmedValue);
    const hasLongSpecialCharSequence = /[^a-zA-Z0-9]{5,}/.test(trimmedValue);

    if (trimmedValue !== '' && hasAlphanumeric && !hasLongSpecialCharSequence) {
      const currentValues = selectedValues || [];
      if (!currentValues.includes(trimmedValue)) {
        const newValues = [...currentValues, trimmedValue];
        setSelectedValues(newValues);
        onChange(newValues);
        setInputValue('');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // For desktop: handle Enter key
    if (e.key === 'Enter' && inputValue !== '') {
      e.preventDefault();
      addSkill(inputValue);
    }

    // Handle backspace for removing chips
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (inputValue === '' && (selectedValues || []).length > 0) {
        handleUnselect(selectedValues[selectedValues.length - 1]);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value: value2 } = e.target;
    setInputValue(value2);

    // Mobile-friendly: Check for comma or space separation
    if (value2.includes(',')) {
      const parts = value2.split(/[,]+/).filter((part) => part.trim() !== '');
      if (parts.length > 1) {
        // Add all parts except the last one (which might be incomplete)
        parts.slice(0, -1).forEach((part) => addSkill(part));
        // Set the last part as the current input value
        setInputValue(parts[parts.length - 1]);
      }
    }
  };

  // Handle composition events for mobile keyboards
  const handleCompositionEnd = (
    e: React.CompositionEvent<HTMLInputElement>,
  ) => {
    const { value: value2 } = e.currentTarget;
    setInputValue(value2);

    // Check if the composition ended with a comma or space
    if (value2.includes(',')) {
      const parts = value2.split(/[,]+/).filter((part) => part.trim() !== '');
      if (parts.length > 1) {
        parts.slice(0, -1).forEach((part) => addSkill(part));
        setInputValue(parts[parts.length - 1]);
      }
    }
  };

  return (
    <div className="relative" style={{ width: fullWidth ? '100%' : '' }}>
      <div className="group rounded-md border border-input px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring">
        <div className="flex flex-wrap gap-1">
          {typeof selectedValues === 'string'
            ? null
            : (selectedValues || []).map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="break-all bg-muted hover:bg-muted/80"
                >
                  {item}
                  <button
                    type="button"
                    className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUnselect(item);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={() => handleUnselect(item)}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              ))}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onCompositionEnd={handleCompositionEnd}
            onBlur={() => {
              onBlur?.();
              setTimeout(() => setOpen(false), 500);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
          {showAddButton && inputValue.trim() !== '' && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="ml-2 h-6 w-6 p-0"
              onClick={() => addSkill(inputValue)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="relative mt-2" style={{ zIndex: 1000 }}>
        {open && suggestions.length > 0 && (
          <div
            className="absolute left-0 top-full w-full rounded-md bg-background pb-5 shadow-md"
            role="listbox"
          >
            {suggestions.map((suggestion) => (
              <div
                key={suggestion}
                role="option"
                aria-selected={false}
                tabIndex={0}
                onClick={() => {
                  onSuggestionClick?.(suggestion);
                  setTimeout(() => setOpen(false), 100);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSuggestionClick?.(suggestion);
                    setTimeout(() => setOpen(false), 100);
                  }
                }}
                className="cursor-pointer px-2 py-1 capitalize hover:bg-accent focus:bg-accent focus:outline-none"
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
