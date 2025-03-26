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
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { CandidateDetailsDialog } from "@/app/dashboard/jobs/[id]/components/candidate-details-dialog";
import { useState } from "react";
import { Candidate } from "@/types/candidate";

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
}: SearchResultsProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => onSort("name")}
                >
                  <div className="flex items-center">
                    Name
                    {getSortIcon("name")}
                  </div>
                </TableHead>
                <TableHead>Skills</TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => onSort("location")}
                >
                  <div className="flex items-center">
                    Location
                    {getSortIcon("location")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => onSort("expectedCTC")}
                >
                  <div className="flex items-center">
                    ECTC
                    {getSortIcon("expectedCTC")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => onSort("currentCTC")}
                >
                  <div className="flex items-center">
                    CCTC
                    {getSortIcon("currentCTC")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => onSort("experience")}
                >
                  <div className="flex items-center">
                    Exp
                    {getSortIcon("experience")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => onSort("createdAt")}
                >
                  <div className="flex items-center">
                    Applied
                    {getSortIcon("createdAt")}
                  </div>
                </TableHead>
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
                  <TableCell className="font-medium">
                    {candidate.name}
                  </TableCell>
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
                  <TableCell>{candidate.location}</TableCell>
                  <TableCell>
                    {formatCurrency(candidate?.expectedCTC ?? 0)}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(candidate?.currentCTC ?? 0)}
                  </TableCell>
                  <TableCell>{candidate.experience} years</TableCell>
                  <TableCell>
                    {format(
                      new Date(candidate.tracking?.createdAt || Date.now()),
                      "MMM d, yyyy"
                    )}
                  </TableCell>
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

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => onPageChange(page)}
                        isActive={page === currentPage}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

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
