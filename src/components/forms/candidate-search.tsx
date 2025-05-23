"use client";

import { useEffect, useState } from "react";
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
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import withAuthGuard from "../withAuthGuard";

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
    maxExpectedCTC: Yup.number()
      .nullable()
      .when("minExpectedCTC", ([minExpectedCTC], schema) =>
        minExpectedCTC !== undefined
          ? schema.moreThan(
              minExpectedCTC,
              "Max Expected CTC must be greater than Min Expected CTC"
            )
          : schema
      ),
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
    maxCurrentCTC: Yup.number()
      .nullable()
      .when("minCurrentCTC", ([minCurrentCTC], schema) =>
        minCurrentCTC !== undefined
          ? schema.moreThan(
              minCurrentCTC,
              "Max Current CTC must be greater than Min Current CTC"
            )
          : schema
      ),
    createdAfter: Yup.string(),
    createdBefore: Yup.string().when(
      "createdAfter",
      ([createdAfter], schema) =>
        createdAfter
          ? schema.test(
              "is-after",
              "To date must be after From date",
              (value) => !value || new Date(value) > new Date(createdAfter)
            )
          : schema
    ),
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
      createdAfter?: string;
      createdBefore?: string;
    } = {
      minExpectedCTC: "",
      maxExpectedCTC: "",
      minExperience: "",
      maxExperience: "",
      minCurrentCTC: "",
      maxCurrentCTC: "",
      createdAfter: "",
      createdBefore: "",
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

    // FIX: Correct error messages for date fields
    if (
      (values.createdAfter && !values.createdBefore) ||
      (!values.createdAfter && values.createdBefore)
    ) {
      errors.createdAfter =
        "Both Created After and Created Before dates must be provided together";
      errors.createdBefore =
        "Both Created After and Created Before dates must be provided together";
    }

    const errorMessages = Object.keys(errors)
      .filter((key) => errors[key as keyof typeof errors])
      .map((key) => errors[key as keyof typeof errors])
      .join(", ");

    return errorMessages
      ? new Yup.ValidationError(errorMessages, values)
      : true;
  });

function CandidateSearch() {
  const [searchResults, setSearchResults] = useState<Candidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const itemsPerPage = 10;
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
  };

  const [currentFilters, setCurrentFilters] =
    useState<SearchFilter>(initialValues);

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
      values.organizationId = OrgID ? OrgID : values.organizationId;
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

  useEffect(() => {
    (async () => {
      const token = Cookies.get("token");
      if (token) {
        const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
        if (decryptedResponse.success && decryptedResponse.user) {
          setOrgID(decryptedResponse.user.organizationId);
          console.log(
            "decryptedResponse.user.organizationId :>> ",
            decryptedResponse.user.organizationId
          );
          handleSearch({
            name: "",
            skills: [],
            location: "",
            createdAfter: "",
            createdBefore: "",
            logicOperator: "$and",
            organizationId: decryptedResponse.user.organizationId,
          });
        }
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
          onSubmit={(values) => {
            const trimmedValues = {
              ...values,
              name: values.name?.trim() || "",
              location: values.location?.trim() || "",
            };
            handleSearch(trimmedValues);
          }}
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

export default withAuthGuard(CandidateSearch, {
  requiredRoles: ["admin", "hr"],
  fallbackPath: "/dashboard",
  checkAllowance: false,
  allowAuthenticated: true,
});
