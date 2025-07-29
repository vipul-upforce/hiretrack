'use client';
import { useState } from 'react';
import { ChevronDown, Filter, LayoutList, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CandidatesPage() {
    const [view, setView] = useState<'board' | 'list'>('board');
    const [showFilters, setShowFilters] = useState(false);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                    {/* All Jobs Dropdown */}
                    <button className="border px-4 py-2 rounded-md flex items-center gap-2 shadow-sm">
                        <span>All Jobs (156)</span>
                        <ChevronDown size={16} />
                    </button>

                    {/* View Toggle */}
                    <div className="bg-muted p-1 rounded-md flex gap-1">
                        <button
                            onClick={() => setView('board')}
                            className={cn(
                                'px-3 py-1 rounded-md flex items-center gap-1 text-sm',
                                view === 'board' ? 'bg-white shadow text-black' : 'text-muted-foreground'
                            )}
                        >
                            <LayoutGrid size={16} />
                            Board
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={cn(
                                'px-3 py-1 rounded-md flex items-center gap-1 text-sm',
                                view === 'list' ? 'bg-white shadow text-black' : 'text-muted-foreground'
                            )}
                        >
                            <LayoutList size={16} />
                            List
                        </button>
                    </div>
                </div>

                {/* Filter Button */}
                <div className="relative">
                    <button
                        className="border px-4 py-2 rounded-md flex items-center gap-2 shadow-sm"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter size={16} />
                        Filters
                    </button>

                    {showFilters && (
                        <div className="absolute right-0 mt-2 w-72 bg-background shadow-lg rounded-lg p-4 border z-10">
                            <h4 className="font-medium mb-2">Filter Candidates</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-muted-foreground">Assigned To</label>
                                    <Select>
                                        <SelectTrigger className="w-full mt-1">
                                            <SelectValue placeholder="All Assignees" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Assignees</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground">AI Score Range</label>
                                    <Select>
                                        <SelectTrigger className="w-full mt-1">
                                            <SelectValue placeholder="All Scores" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Scores</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground">Application Date</label>
                                    <Select>
                                        <SelectTrigger className="w-full mt-1">
                                            <SelectValue placeholder="All Time" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Time</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>


            {/* Content Placeholder */}
            <div className="border-2 border-dashed h-64 rounded-md flex items-center justify-center text-gray-400">
                {view === 'board' ? 'Board View Content' : 'List View Content'}
            </div>
        </div>
    );
}
