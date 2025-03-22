"use client";

import { useState } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { SearchFilters } from "@/components/forms/search-filters";
import { SearchResults } from "@/components/forms/search-results";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TimerResetIcon as ResetIcon, SearchIcon } from "lucide-react";
import { useFilterCandidatesMutation } from "@/lib/features/candidate/candidateApi";
import Cookies from "js-cookie";
import { useToast } from "@/hooks/use-toast";
import { Candidate } from "@/types/candidate";

// Define the search filter interface
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
}

// Define the validation schema
const SearchSchema = Yup.object()
  .shape({
    name: Yup.string(),
    skills: Yup.array().of(Yup.string()),
    location: Yup.string(),
    minExpectedCTC: Yup.number().nullable(),
    maxExpectedCTC: Yup.number().nullable(),
    minExperience: Yup.number()
      .nullable()
      .min(0, "Minimum experience cannot be negative"),
    maxExperience: Yup.number()
      .nullable()
      .min(
        Yup.ref("minExperience"),
        "Max experience must be greater than min experience"
      ),
    minCurrentCTC: Yup.number().nullable(),
    maxCurrentCTC: Yup.number().nullable(),
    createdAfter: Yup.string(),
    createdBefore: Yup.string(),
    organizationId: Yup.string(),
    logicOperator: Yup.string().oneOf(["$and", "$or"]),
  })
  .test("paired-fields", "Invalid field pairing", (values) => {
    const errors: {
      minExpectedCTC: string;
      maxExpectedCTC: string;
      minExperience: string;
      maxExperience: string;
      minCurrentCTC: string;
      maxCurrentCTC: string;
    } = {
      minExpectedCTC: "",
      maxExpectedCTC: "",
      minExperience: "",
      maxExperience: "",
      minCurrentCTC: "",
      maxCurrentCTC: "",
    };

    // Check Expected CTC pair
    if (
      (values.minExpectedCTC && !values.maxExpectedCTC) ||
      (!values.minExpectedCTC && values.maxExpectedCTC)
    ) {
      errors.minExpectedCTC =
        "Both min and max Expected CTC must be provided together";
      errors.maxExpectedCTC =
        "Both min and max Expected CTC must be provided together";
    }

    // Check Experience pair
    if (
      (values.minExperience && !values.maxExperience) ||
      (!values.minExperience && values.maxExperience)
    ) {
      errors.minExperience =
        "Both min and max Experience must be provided together";
      errors.maxExperience =
        "Both min and max Experience must be provided together";
    }

    // Check Current CTC pair
    if (
      (values.minCurrentCTC && !values.maxCurrentCTC) ||
      (!values.minCurrentCTC && values.maxCurrentCTC)
    ) {
      errors.minCurrentCTC =
        "Both min and max Current CTC must be provided together";
      errors.maxCurrentCTC =
        "Both min and max Current CTC must be provided together";
    }

    const errorMessages = Object.keys(errors)
      .filter((key) => errors[key as keyof typeof errors])
      .map((key) => errors[key as keyof typeof errors])
      .join(", ");

    return errorMessages
      ? new Yup.ValidationError(errorMessages, values)
      : true;
  });

export default function CandidateSearch() {
  const [searchResults, setSearchResults] = useState<Candidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const itemsPerPage = 10;
  const { toast } = useToast();

  // Safely parse the user cookie
  const user = Cookies.get("user");
  const orgID = user ? JSON.parse(user).organizationId : ""; // Provide a default value

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
    organizationId: orgID, // Use the parsed orgID
    logicOperator: "$and",
  };

  const [currentFilters, setCurrentFilters] = useState<SearchFilter>(initialValues);

  const [filterCandidates] = useFilterCandidatesMutation();

  const refetchResults = async () => {
    setIsSearching(true);
    try {
      const response = await filterCandidates(currentFilters).unwrap();
      setSearchResults(response.candidates || []);
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

  const handleSearch = async (values: SearchFilter) => {
    setIsSearching(true);
    setCurrentFilters(values); // Store the current filters

    try {
      const response = await filterCandidates(values).unwrap();
      setSearchResults(response.candidates || []); 
      setCurrentPage(1);
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

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedResults = sortField
    ? [...searchResults].sort((a, b) => {
        const aValue = a[sortField as keyof Candidate];
        const bValue = b[sortField as keyof Candidate];

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
        return typeof aValue === "string" ? 1 : -1; // Adjust as needed for your sorting logic
      })
    : searchResults;

  const paginatedResults = Array.isArray(sortedResults)
    ? sortedResults.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
    : [];

  const totalPages = Math.ceil(sortedResults.length / itemsPerPage);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <Formik
          initialValues={initialValues}
          validationSchema={SearchSchema}
          onSubmit={handleSearch}
        >
          {({ resetForm, isValid, dirty }) => (
            <Form className="space-y-6">
              <SearchFilters />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => resetForm()}
                  disabled={!dirty}
                >
                  <ResetIcon className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button type="submit" disabled={isSearching || !isValid}>
                  <SearchIcon className="mr-2 h-4 w-4" />
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </Card>

      <SearchResults
        results={paginatedResults}
        isLoading={isSearching}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        refetch={refetchResults}
      />
    </div>
  );
}
