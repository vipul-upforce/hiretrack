"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ComboboxProps {
  options: { value: string; label: string }[];
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  width?: string;
}

export function Combobox({
  options,
  placeholder = "Select an option...",
  value,
  onValueChange,
  width = "200px",
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0, width: 0 });
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // Calculate button position when dropdown opens
  const updatePosition = React.useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, []);

  // Focus the input when the dropdown opens
  React.useEffect(() => {
    if (open && inputRef.current) {
      updatePosition();
      console.log("Dropdown opened, attempting to focus input");
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          console.log(
            "Input focused:",
            document.activeElement === inputRef.current
          );
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, updatePosition]);

  // Close dropdown when clicking outside and handle window resize
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        console.log("Clicked outside, closing dropdown");
        setOpen(false);
        setSearch("");
      }
    };

    const handleResize = () => {
      if (open) {
        updatePosition();
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleResize, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [open, updatePosition]);

  // Filter options based on search input
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const dropdown = open && typeof document !== 'undefined' ? createPortal(
    <div
      ref={dropdownRef}
      className={cn(
        "fixed bg-background border border-border rounded-md shadow-lg z-[9999] transition-all duration-200 ease-in-out",
        open
          ? "opacity-100 transform translate-y-0"
          : "opacity-0 transform -translate-y-2 pointer-events-none"
      )}
      style={{
        top: dropdownPosition.top + 4,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
      }}
    >
      <input
        ref={inputRef}
        type="text"
        placeholder="Search..."
        className="h-9 w-full border-b border-border bg-background text-foreground px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onMouseDown={(e) => e.stopPropagation()} // Prevent mousedown from closing dropdown
        onFocus={() => console.log("Custom input focused")}
        onBlur={() => console.log("Custom input blurred")}
      />
      <div className="max-h-[200px] overflow-y-auto">
        {filteredOptions.length === 0 && (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            No option found.
          </div>
        )}
        {filteredOptions.map((option) => (
          <div
            key={option.value}
            className={cn(
              "flex cursor-pointer items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
              value === option.value ? "bg-accent text-accent-foreground font-medium" : "text-foreground"
            )}
            onClick={() => {
              console.log("Option selected:", option.value);
              onValueChange(option.value === value ? "" : option.value);
              setOpen(false);
              setSearch("");
            }}
          >
            {option.label}
            <Check
              className={cn(
                "ml-auto h-4 w-4",
                value === option.value ? "opacity-100" : "opacity-0"
              )}
            />
          </div>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative" style={{ width }}>
      <Button
        type="button"
        ref={buttonRef}
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn("justify-between", `w-full`)}
        onClick={() => {
          console.log("Button clicked, current open state:", open);
          updatePosition();
          setOpen(true);
        }}
      >
        {value
          ? options.find((option) => option.value === value)?.label
          : placeholder}
        <ChevronsUpDown className="opacity-50" />
      </Button>
      {dropdown}
    </div>
  );
}
