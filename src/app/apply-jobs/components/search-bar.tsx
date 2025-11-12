"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  primaryColor: string;
  secondaryColor: string;
  placeholder?: string;
}

export function SearchBar({
  searchTerm,
  onSearchChange,
  onSearch,
  primaryColor,
  secondaryColor,
  placeholder = "Search...",
}: SearchBarProps) {
  return (
    <div className="flex gap-3 mb-8 w-full flex-row">
      <div className="relative w-full flex flex-row items-center max-w-md">
        <Input
          type="text"
          placeholder={placeholder}
          className="pl-12 pr-4 py-3 border rounded-xl bg-white dark:bg-black border-gray-200 dark:border-gray-700 focus:ring-2 w-full transition-colors"
          onFocus={(e) => {
            e.target.style.borderColor = primaryColor;
            e.target.style.boxShadow = `0 0 0 2px ${primaryColor}20`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "rgb(209 213 219)";
            e.target.style.boxShadow = "none";
          }}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSearch();
            }
          }}
        />
        <Search className="absolute left-4 text-gray-400 h-5 w-5" />
      </div>
      <Button
        onClick={onSearch}
        className="px-6 py-3 text-sm font-semibold rounded-xl text-white transition-colors"
        style={{
          backgroundColor: primaryColor,
          borderColor: primaryColor,
        }}
        onMouseEnter={(e) => {
          const target = e.target as HTMLElement;
          target.style.backgroundColor = secondaryColor;
        }}
        onMouseLeave={(e) => {
          const target = e.target as HTMLElement;
          target.style.backgroundColor = primaryColor;
        }}
      >
        <Search className="w-4 h-4 mr-2" />
        Search
      </Button>
    </div>
  );
}
