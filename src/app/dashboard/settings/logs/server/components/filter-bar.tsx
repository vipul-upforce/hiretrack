import { Search, RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  pageSize: number;
  onPageSizeChange: (val: string) => void;
}

export function FilterBar({
  searchTerm,
  onSearchChange,
  onRefresh,
  isRefreshing,
  pageSize,
  onPageSizeChange,
}: FilterBarProps) {
  return (
    <div className="mb-4 flex-shrink-0 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between bg-card/60 border rounded-lg p-3 sm:p-4">
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          aria-label="Search history logs"
          placeholder="Search logs by candidate, job title, email, skills, or remarks..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={onRefresh} disabled={isRefreshing} variant="secondary">
          <RefreshCwIcon
            className={`h-1 w-1 transition-transform ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          />
        </Button>
        <span className="text-sm text-muted-foreground">Items per page</span>
        <Select
          value={String(pageSize)}
          onValueChange={onPageSizeChange}
          disabled={isRefreshing}
        >
          <SelectTrigger
            className="w-[100px]"
            aria-label="Select items per page"
          >
            <SelectValue placeholder="Page size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
