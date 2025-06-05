"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

import { ArrowDown, ArrowUp, ArrowUpDown, Eye } from "lucide-react";
import { format } from "date-fns";
import { CandidateDetailsDialog } from "@/app/dashboard/jobs/[id]/components/Dialogs/candidate-details-dialog";
import { useState } from "react";
import { Candidate } from "@/types/candidate";
import { PaginationInfo } from "../ui/PaginationInfo";
import { itemsPerPage } from "./candidate-search";

interface SearchResultsProps {
  results: Candidate[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  sortField: string | null;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
  refetch: () => Promise<void>;
  totalResultsCount?: number;
}

export function SearchResults({
  results,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
  sortField,
  sortDirection,
  onSort,
  refetch,
  totalResultsCount,
}: SearchResultsProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    {
      name: true,
      skills: true,
      location: true,
      expectedCTC: true,
      currentCTC: true,
      experience: true,
      createdAt: true,
    }
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">Loading results...</div>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          No results found. Try adjusting your search criteria.
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex justify-start p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              {Object.entries(visibleColumns).map(([key, value]) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={value}
                  onCheckedChange={(checked) =>
                    setVisibleColumns((prev) => ({
                      ...prev,
                      [key]: !!checked,
                    }))
                  }
                >
                  {key.toLocaleUpperCase()}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.name && (
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => onSort("name")}
                  >
                    <div className="flex items-center">
                      Name
                      {getSortIcon("name")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.skills && <TableHead>Skills</TableHead>}
                {visibleColumns.location && (
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => onSort("location")}
                  >
                    <div className="flex items-center">
                      Location
                      {getSortIcon("location")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.expectedCTC && (
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => onSort("expectedCTC")}
                  >
                    <div className="flex items-center">
                      ECTC
                      {getSortIcon("expectedCTC")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.currentCTC && (
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => onSort("currentCTC")}
                  >
                    <div className="flex items-center">
                      CCTC
                      {getSortIcon("currentCTC")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.experience && (
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => onSort("experience")}
                  >
                    <div className="flex items-center">
                      Exp
                      {getSortIcon("experience")}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.createdAt && (
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => onSort("createdAt")}
                  >
                    <div className="flex items-center">
                      Applied
                      {getSortIcon("createdAt")}
                    </div>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((candidate) => (
                <TableRow
                  key={candidate._id}
                  onClick={() => {
                    setSelectedCandidate(candidate);
                    setIsDialogOpen(true);
                  }}
                >
                  {visibleColumns.name && (
                    <TableCell className="font-medium">
                      {candidate.name}
                    </TableCell>
                  )}
                  {visibleColumns.skills && (
                    <TableCell className="w-[50%]">
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills.map((skill: string) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="text-xs"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.location && (
                    <TableCell>{candidate.location}</TableCell>
                  )}
                  {visibleColumns.expectedCTC && (
                    <TableCell>
                      {formatCurrency(candidate?.expectedCTC ?? 0)}
                    </TableCell>
                  )}
                  {visibleColumns.currentCTC && (
                    <TableCell>
                      {formatCurrency(candidate?.currentCTC ?? 0)}
                    </TableCell>
                  )}
                  {visibleColumns.experience && (
                    <TableCell>{candidate.experience} years</TableCell>
                  )}
                  {visibleColumns.createdAt && (
                    <TableCell>
                      {format(
                        new Date(candidate.tracking?.createdAt || Date.now()),
                        "MMM d, yyyy"
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    className={
                      currentPage === 1
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>

                {(() => {
                  const maxPagesToShow = 10;
                  const startPage = Math.max(
                    1,
                    currentPage - Math.floor(maxPagesToShow / 2)
                  );
                  const endPage = Math.min(
                    totalPages,
                    startPage + maxPagesToShow - 1
                  );

                  const pages = [];
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <PaginationItem key={i}>
                        <PaginationLink
                          onClick={() => onPageChange(i)}
                          isActive={i === currentPage}
                          className="cursor-pointer"
                        >
                          {i}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  return pages;
                })()}

                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      onPageChange(Math.min(totalPages, currentPage + 1))
                    }
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <PaginationInfo
              total={totalResultsCount as number}
              page={currentPage}
              perPage={itemsPerPage}
              className="flex justify-center mt-3"
            />
          </div>
        )}
      </Card>

      {selectedCandidate && (
        <CandidateDetailsDialog
          candidate={selectedCandidate}
          isOpen={isDialogOpen}
          fromFilter={true}
          onOpenChange={() => {
            setSelectedCandidate(null);
            setIsDialogOpen(false);
          }}
          refetchCandidates={refetch}
        />
      )}
    </>
  );
}
