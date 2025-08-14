"use client";

import { useEffect, useState, useCallback } from "react";
import { Formik, Form } from "formik";
import { SearchFilters } from "@/components/forms/search-filters";
import { SearchResults } from "@/components/forms/search-results";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TimerResetIcon as ResetIcon, SearchIcon } from "lucide-react";
import { useFilterCandidatesMutation } from "@/lib/features/candidate/candidateApi";
import Cookies from "js-cookie";
import { useToast } from "@/hooks/use-toast";
import { Candidate } from "@/types/candidate";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
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
  const [currentPageLimit, setCurrentPageLimit] = useState(100);
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
    page: 1,
    limit: 100,
    customFields: null,
  };

  const [currentFilters, setCurrentFilters] =
    useState<SearchFilter>(initialValues);

  const [filterCandidates] = useFilterCandidatesMutation();

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
      const response = await filterCandidates(currentFilters).unwrap();
      setSearchResults(response.candidates || []);
      // Update pagination info if available
      if (response.pagination) {
        setCurrentPage(response.pagination.page || 1);
        setCurrentPageLimit(response.pagination.limit || 100);
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
  }, [currentFilters, filterCandidates, toast]);

  const handleSearch = async (values: SearchFilter) => {
    setIsSearching(true);
    setCurrentFilters(values);

    try {
      values.organizationId = OrgID ? OrgID : values.organizationId;
      const response = await filterCandidates(values).unwrap();
      setSearchResults(response.candidates || []);
      setCurrentPage(response?.pagination?.page || 1);
      setCurrentPageLimit(response?.pagination?.limit || 100);
      setTotalPages(response?.pagination?.totalPages || 0);
      setTotalRecordsCount(response?.pagination?.total);
    } catch (error) {
      toast({
        title: "Error",
        description: `${error instanceof Error ? error.message : ""}`,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (user) {
        setOrgID(user.organizationId);
        handleSearch({
          name: "",
          skills: [],
          location: "",
          createdAfter: "",
          createdBefore: "",
          logicOperator: "$and",
          organizationId: user.organizationId,
          page: currentPage,
          limit: currentPageLimit,
        });
      }
    })();
  }, []);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const onPageChange = async (pageNumber: number) => {
    if (!user || pageNumber < 1 || pageNumber > totalPages) return;

    setCurrentPage(pageNumber); // Update current page immediately
    const updatedFilters = {
      ...currentFilters,
      organizationId: user.organizationId,
      page: pageNumber,
    };

    setCurrentFilters(updatedFilters);
    await handleSearch(updatedFilters);
  };
  const onLimitChange = async (pageLimit: number) => {
    if (!user || pageLimit < 1) return;

    setCurrentPageLimit(pageLimit); // Update current page immediately
    const updatedFilters = {
      ...currentFilters,
      organizationId: user.organizationId,
      limit: pageLimit,
    };

    setCurrentFilters(updatedFilters);
    await handleSearch(updatedFilters);
  };

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
            };
            handleSearch(trimmedValues);
          }}
        >
          {({ resetForm, isValid, dirty }) => (
            <Form className="space-y-6">
              <SearchFilters handleSearch={handleSearch} />

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => resetForm()}
                  disabled={!dirty}
                  className="px-6"
                >
                  <ResetIcon className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button
                  type="submit"
                  disabled={isSearching || !isValid}
                  variant="primary"
                  className="px-8"
                  size="lg"
                >
                  <SearchIcon className="mr-2 h-4 w-4" />
                  {isSearching ? "Searching..." : "Search"}
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
        isLoading={isSearching}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        refetch={async () => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          refetchResults;
        }} // Use the memoized version
        onCandidateUpdate={handleCandidateUpdate} // Add the optimistic update handler
      />
    </div>
  );
}

export default withAuthGuard(CandidateSearch);
