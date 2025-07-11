'use client';
import { useState } from 'react';
import { ChevronDown, Filter, LayoutList, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

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
                        <div className="absolute right-0 mt-2 w-72 bg-white shadow-lg rounded-lg p-4 border z-10">
                            <h4 className="font-medium mb-2">Filter Candidates</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-gray-500">Assigned To</label>
                                    <select className="w-full border px-2 py-1 rounded mt-1">
                                        <option>All Assignees</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500">AI Score Range</label>
                                    <select className="w-full border px-2 py-1 rounded mt-1">
                                        <option>All Scores</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500">Application Date</label>
                                    <select className="w-full border px-2 py-1 rounded mt-1">
                                        <option>All Time</option>
                                    </select>
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
