"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Cookies from "js-cookie";
import { Input } from "@/components/ui/input";
import { OrgInfo } from "@/lib/models/user";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import DashboardLoader from "./components/dashboard-loader";
import ActionItems from "@/components/actionitems";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  formatDate,
  formatTime,
} from "./jobs/[id]/components/candidate-details-dialog";
import { BriefcaseIcon, CalendarIcon, ClockIcon, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CandidateStatusBadge } from "./jobs/[id]/components/candidate-status-badge";
import { CandidateStatus } from "@/types/candidate";

interface User {
  name: string;
  email: string;
  role: string;
  organizationInfo: OrgInfo;
}

export interface Assignment {
  id: string;
  _id?: string;
  candidateName: string;
  jobTitle: string;
  interviewDate: string;
  status: string;
  assignment: {
    assignedAt: string;
    time: string;
    name: string;
    interviewerId: {
      _id: string;
      name: string;
      email: string;
    };
    jobId: {
      title: string;
      skills: string[];
      description: string;
    };
  };
  jobId: {
    _id: string;
    title: string;
    skills: string[];
    description: string;
  };
  name: string;
  resume: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
  tracking: {
    createdAt: string;
    updatedAt: string;
  };
  organizationId: string;
  location: string;
  experience: number;
  skills: string[];
  expectedCTC?: number;
  currentCTC?: number;
  noticePeriod: number;
  remarks: {
    description: string;
    date: string;
    userId: {
      _id: string;
      name: string;
      email: string;
    };
  };
  attachments: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    _id: string;
  }[];
  customFields: { [key: string]: string };
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filterText, setFilterText] = useState("");
  const shouldShowAssignments = user?.role === "admin" || user?.role === "hr";
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // Adjust this number as needed

  // Fetch assignments
  const fetchAssignments = useCallback(async () => {
    try {
      const response = await fetch("/api/candidates/assignments");
      const data = await response.json();
      setAssignments(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkUser = async () => {
    const user = Cookies.get("token");
    if (user) {
      const decryptedResponse = await verifyAndDecryptJWTToken(String(user));
      if (decryptedResponse.success && decryptedResponse.user) {
        setUser(decryptedResponse.user);
      }
    }
  };
  useEffect(() => {
    checkUser();
    fetchAssignments();
  }, [fetchAssignments]);

  const applyFilter = () => {
    setFilterText(searchText);
  };

  const filteredAssignments = assignments?.filter((assignment) => {
    if (!filterText) return true;
    const searchRegex = new RegExp(filterText, "i");

    const jobSkills = assignment.jobId?.skills || [];
    const assignmentSkills = assignment.skills || [];
    const assignmentJobSkills = assignment.assignment?.jobId?.skills || [];
    const allSkills = [
      ...jobSkills,
      ...assignmentSkills,
      ...assignmentJobSkills,
    ];

    return (
      searchRegex.test(assignment.name || "") ||
      searchRegex.test(assignment?.assignment?.interviewerId?.name || "") ||
      searchRegex.test(assignment.jobId?.title || "") ||
      (allSkills.length > 0 &&
        allSkills.some((skill) => searchRegex.test(skill || "")))
    );
  });

  const todayAssignments = filteredAssignments?.filter((assignment) => {
    const assignmentDate = new Date(assignment.assignment.time).toDateString();
    const today = new Date().toDateString();
    return assignmentDate === today;
  });

  const thisWeekAssignments = filteredAssignments?.filter((assignment) => {
    const assignmentDate = new Date(assignment.assignment.time);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    return assignmentDate >= startOfWeek && assignmentDate <= endOfWeek;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex justify-start">
              {isLoading ? <LoadingSpinner /> : assignments?.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex justify-start">
              {isLoading ? <LoadingSpinner /> : thisWeekAssignments?.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex justify-start">
              {isLoading ? <LoadingSpinner /> : todayAssignments?.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Input and Filter Button */}
      <div className="mt-6 flex gap-2 items-center">
        <Input
          placeholder="Search assignments..."
          value={searchText}
          onChange={(e) => {
            const value = e.target.value;
            const sanitizedValue = value.replace(
              /[\/\\*+?|\{\}\[\]()^$\.]/g,
              ""
            );

            setSearchText(sanitizedValue);
          }}
          className="max-w-md"
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              applyFilter();
            }
          }}
        />
        <Button onClick={applyFilter}>Filter</Button>
      </div>

      {shouldShowAssignments ? (
        <div>
          <h2 className="text-2xl font-bold mb-4">All Assignments</h2>
          {isLoading ? (
            <DashboardLoader />
          ) : filteredAssignments?.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAssignments
                  ?.slice(
                    (currentPage - 1) * itemsPerPage,
                    currentPage * itemsPerPage
                  )
                  .map((assignment) => (
                    <ActionItems
                      key={assignment.id || assignment._id}
                      assignment={assignment}
                      fetchAssignments={fetchAssignments}
                    />
                  ))}
              </div>

              {/* Pagination Controls */}
              <div className="flex justify-center items-center gap-4 mt-6">
                <Button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  variant="outline"
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of{" "}
                  {Math.ceil(filteredAssignments.length / itemsPerPage)}
                </span>
                <Button
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(
                        prev + 1,
                        Math.ceil(filteredAssignments.length / itemsPerPage)
                      )
                    )
                  }
                  disabled={
                    currentPage ===
                    Math.ceil(filteredAssignments.length / itemsPerPage)
                  }
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </>
          ) : (
            <p className="text-lg font-semibold text-gray-500 text-center py-10 w-full flex justify-center items-center">
              No assignments found.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Today's Interviews</h2>
          {isLoading ? (
            <DashboardLoader />
          ) : todayAssignments?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayAssignments?.map((assignment) => (
                <Card key={assignment.id || Math.random().toString()}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg capitalize">
                      <div className="flex pb-2 flex-row items-center justify-between">
                        <p>{assignment.name}</p>
                        <div>
                          <CandidateStatusBadge
                            status={assignment.status as CandidateStatus}
                          />
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Position */}
                      <div className="flex items-start gap-2">
                        <BriefcaseIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Position
                          </p>
                          <p className="font-medium">
                            {assignment?.jobId?.title || "N/A"}
                          </p>
                        </div>
                      </div>

                      {/* Skills */}
                      <div className="flex items-start gap-2">
                        {/* <div className="h-5 w-5 flex-shrink-0" /> */}
                        <Zap className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-muted-foreground mb-1.5">
                            Skills
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {assignment.skills.slice(0, 3).map((skill) => (
                              <Badge
                                key={skill}
                                variant="secondary"
                                className="text-xs"
                              >
                                {skill}
                              </Badge>
                            ))}
                            {assignment.skills.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{assignment.skills.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Date and Time */}
                      <div className="grid grid-cols-2 gap-4 pt-1">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Date
                            </p>
                            <p className="text-sm font-medium">
                              {assignment.assignment.time
                                ? formatDate(
                                    assignment.assignment.time.toLocaleString()
                                  )
                                : "N/A"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Time
                            </p>
                            <p className="text-sm font-medium">
                              {assignment.assignment.time
                                ? formatTime(
                                    assignment.assignment.time.toLocaleString()
                                  )
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-lg font-semibold text-gray-500 text-center py-10 w-full flex justify-center items-center">
              No interviews scheduled for today.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
