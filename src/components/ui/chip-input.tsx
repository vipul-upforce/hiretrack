"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ChipInputProps {
  value?: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
  onBlur?: () => void;
  fullWidth?: boolean;
}

export function ChipInput({
  value = [],
  onChange,
  placeholder,
  suggestions = [],
  onSuggestionClick,
  onBlur,
  fullWidth,
}: ChipInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [selectedValues, setSelectedValues] = React.useState<string[]>([]);

  React.useEffect(() => {
    // if (value.length > 0) {
    if (typeof value === "string") {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "" && (selectedValues || []).length > 0) {
          handleUnselect(selectedValues[selectedValues.length - 1]);
        }
      }
      if (e.key === "Enter" && input.value !== "") {
        e.preventDefault();
        const trimmedValue = input.value.trim();
        const hasAlphanumeric = /[a-zA-Z0-9]/.test(trimmedValue);
        const hasLongSpecialCharSequence = /[^a-zA-Z0-9]{5,}/.test(
          trimmedValue
        );

        if (
          trimmedValue !== "" &&
          hasAlphanumeric &&
          !hasLongSpecialCharSequence
        ) {
          const currentValues = selectedValues || [];
          if (!currentValues.includes(trimmedValue)) {
            const newValues = [...currentValues, trimmedValue];
            setSelectedValues(newValues);
            onChange(newValues);
            setInputValue("");
          }
        }
      }
    }
  };

  return (
    <div className="relative" style={{ width: fullWidth ? "100%" : "" }}>
      <div className="group border border-input px-3 py-2 text-sm rounded-md focus-within:ring-2 focus-within:ring-ring">
        <div className="flex gap-1 flex-wrap">
          {typeof selectedValues === "string"
            ? null
            : (selectedValues || []).map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="bg-muted hover:bg-muted break-all"
                >
                  {item}
                  <button
                    type="button"
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
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
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              onBlur?.();
              setTimeout(() => setOpen(false), 500);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
          />
        </div>
      </div>

      <div className="relative mt-2" style={{ zIndex: 1000 }}>
        {open && suggestions.length > 0 && (
          <div className="absolute top-full left-0 w-full bg-background rounded-md shadow-md pb-5">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion}
                onClick={() => {
                  onSuggestionClick?.(suggestion);
                  setTimeout(() => setOpen(false), 100);
                }}
                className="px-2 py-1 hover:bg-accent cursor-pointer capitalize"
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
