"use client";

import { useEffect, useState, useCallback } from "react";
import { Formik, Form } from "formik";
import { SearchFilters } from "@/components/forms/search-filters";
import { SearchResults } from "@/components/forms/search-results";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TimerResetIcon as ResetIcon, SearchIcon } from "lucide-react";
import { useFilterCandidatesQuery } from "@/lib/features/candidate/candidateApi";
import { useToast } from "@/hooks/use-toast";
import { Candidate } from "@/types/candidate";
import withAuthGuard from "../withAuthGuard";
import { SearchSchema } from "./searchSchema";
import { useSelector } from "react-redux";
import { User } from "@/lib/features/org/orgApi";

export interface CandidateField {
  [key: string]: any;
}

export interface SearchFilter {
  name?: string;
  skills?: string[];
  location?: string;
  minExpectedCTC?: number;
  maxExpectedCTC?: number;
  minExperience?: number;
  maxExperience?: number;
  minCurrentCTC?: number;
  maxCurrentCTC?: number;
  createdAfter?: string;
  createdBefore?: string;
  organizationId?: string;
  logicOperator?: "$and" | "$or";
  page: number;
  limit: number;
  customFields?: CandidateField | null;
}

export const itemsPerPage = 100;

function CandidateSearch() {
  const [searchResults, setSearchResults] = useState<Candidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageLimit, setCurrentPageLimit] = useState(20);
  const [totalRecordsCount, setTotalRecordsCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {}
  );
  const { toast } = useToast();
  const [OrgID, setOrgID] = useState("");

  const initialValues: SearchFilter = {
    name: "",
    skills: [],
    location: "",
    minExpectedCTC: undefined,
    maxExpectedCTC: undefined,
    minExperience: undefined,
    maxExperience: undefined,
    minCurrentCTC: undefined,
    maxCurrentCTC: undefined,
    createdAfter: "",
    createdBefore: "",
    logicOperator: "$and",
    organizationId: user ? user.organizationId : "",
    page: 1,
    limit: 20,
    customFields: null,
  };

  const [currentFilters, setCurrentFilters] =
    useState<SearchFilter>(initialValues);

  const {
    data: filteredCandidates,
    refetch: filterCandidates,
    isFetching,
    isLoading: isQueryLoading,
  } = useFilterCandidatesQuery(currentFilters, {
    skip: !user.organizationId,
  });

  // FIX 1: Move the setSearchResults call inside useEffect
  useEffect(() => {
    if (filteredCandidates) {
      setSearchResults(filteredCandidates.candidates || []);
      // Update pagination info if available
      if (filteredCandidates.pagination) {
        setCurrentPage(filteredCandidates.pagination.page || 1);
        setCurrentPageLimit(filteredCandidates.pagination.limit || 100);
        setTotalPages(filteredCandidates.pagination.totalPages || 0);
        setTotalRecordsCount(filteredCandidates.pagination.total || 0);
      }
      setIsSearching(false);
    }
  }, [filteredCandidates]);

  // Optimistic update handler
  const handleCandidateUpdate = useCallback((updatedCandidate: Candidate) => {
    setSearchResults((prevResults) =>
      prevResults.map((candidate) =>
        candidate._id === updatedCandidate._id ? updatedCandidate : candidate
      )
    );
  }, []);

  const refetchResults = useCallback(async () => {
    setIsSearching(true);
    try {
      const response = await filterCandidates().unwrap();
      setSearchResults(response.candidates || []);
      // Update pagination info if available
      if (response.pagination) {
        setCurrentPage(response.pagination.page || 1);
        setCurrentPageLimit(response.pagination.limit || 20);
        setTotalPages(response.pagination.totalPages || 0);
        setTotalRecordsCount(response.pagination.total || 0);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `${error instanceof Error ? error.message : ""}`,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, [filterCandidates, toast]); // FIX 2: Add dependencies

  const handleSearch = useCallback(
    async (values: SearchFilter) => {
      // FIX 3: Update filters first, then the query will automatically refetch
      const updatedFilters = {
        ...values,
        organizationId: OrgID || values.organizationId,
        createdAfter: values.createdAfter?.trim() || undefined,
        createdBefore: values.createdBefore?.trim() || undefined,
      };

      setCurrentFilters(updatedFilters);
    },
    [OrgID]
  );

  // FIX 4: Simplify the initial load effect
  useEffect(() => {
    if (user && user.organizationId) {
      setOrgID(user.organizationId);
      const initialFilters = {
        ...initialValues,
        organizationId: user.organizationId,
        page: currentPage,
        limit: currentPageLimit,
      };
      setCurrentFilters(initialFilters);
    }
  }, [user]); // Only depend on user

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const onPageChange = useCallback(
    async (pageNumber: number) => {
      if (!user || pageNumber < 1 || pageNumber > totalPages) return;

      setCurrentPage(pageNumber);
      const updatedFilters = {
        ...currentFilters,
        organizationId: user.organizationId,
        page: pageNumber,
      };

      setCurrentFilters(updatedFilters);
    },
    [user, totalPages, currentFilters]
  );

  const onLimitChange = useCallback(
    async (pageLimit: number) => {
      if (!user || pageLimit < 1) return;

      setCurrentPageLimit(pageLimit);
      const updatedFilters = {
        ...currentFilters,
        organizationId: user.organizationId,
        limit: pageLimit,
        page: 1, // Reset to first page when changing limit
      };

      setCurrentFilters(updatedFilters);
    },
    [user, currentFilters]
  );

  const sortedResults = sortField
    ? [...searchResults].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        // Handle custom sorting fields
        if (sortField === "overallScore") {
          aValue = a.scores?.overall ?? 0;
          bValue = b.scores?.overall ?? 0;
        } else if (sortField === "jobAssignment") {
          aValue = a.jobId?.title ?? "";
          bValue = b.jobId?.title ?? "";
        } else {
          aValue = a[sortField as keyof Candidate];
          bValue = b[sortField as keyof Candidate];
        }

        // Ensure both values are strings for localeCompare
        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        // Handle numeric comparison
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
        }

        // Handle cases where one value is a string and the other is a number
        return typeof aValue === "string" ? 1 : -1;
      })
    : searchResults;

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-none">
        <Formik
          initialValues={initialValues}
          validationSchema={SearchSchema}
          onSubmit={(values) => {
            const trimmedValues = {
              ...values,
              name: values.name?.trim() || "",
              location: values.location?.trim() || "",
              customFields: values.customFields,
              createdAfter: values.createdAfter || "",
              createdBefore: values.createdBefore || "",
            };
            handleSearch(trimmedValues);
          }}
        >
          {({ resetForm, isValid, dirty }) => (
            <Form className="space-y-6">
              <SearchFilters
                handleSearch={handleSearch}
                key={JSON.stringify(initialValues)}
              />

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => resetForm()}
                  disabled={!dirty}
                  className="px-6"
                  size="lg"
                >
                  <ResetIcon className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button
                  type="submit"
                  disabled={isQueryLoading || isFetching || !isValid}
                  variant="primary"
                  className="px-8"
                  size="lg"
                >
                  <SearchIcon className="mr-2 h-4 w-4" />
                  {isQueryLoading || isFetching ? "Searching..." : "Search"}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </Card>

      {/* Search Results */}
      <SearchResults
        results={sortedResults}
        totalResultsCount={totalRecordsCount}
        isLoading={isQueryLoading || isFetching}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
        currentPageLimit={currentPageLimit}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        refetch={refetchResults}
        onCandidateUpdate={handleCandidateUpdate}
      />
    </div>
  );
}

export default withAuthGuard(CandidateSearch);
