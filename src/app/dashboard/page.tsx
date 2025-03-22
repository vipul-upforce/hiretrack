"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Cookies from "js-cookie";

import { OrgInfo } from "@/lib/models/user";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLoader from "./components/dashboard-loader";
import ActionItems from "@/components/actionitems";

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
    deadline: string;
    name: string;
    interviewerId: {
      _id: string;
      name: string;
      email: string;
    };
    jobId: {
      title: string;
      skills: string[];
      description : string
    };
  };
  jobId: {
    _id : string;
    title: string;
    skills: string[];
    description : string
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
  // currentLocation: string;
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
  const shouldShowAssignments = user?.role === "admin" || user?.role === "hr";

  // Fetch assignments
  const fetchAssignments = async () => {
    try {
      const response = await fetch("/api/candidates/assignments");
      const data = await response.json();
      setAssignments(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Get user data from localStorage if available
    const userData = Cookies.get("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchAssignments();
  }, []);

  // Get today's assignments
  const todayAssignments = assignments?.filter((assignment) => {
    const assignmentDate = new Date(
      assignment.assignment.deadline
    ).toDateString();
    const today = new Date().toDateString();
    return assignmentDate === today;
  });

  // Get this week's assignments
  const thisWeekAssignments = assignments?.filter((assignment) => {
    const assignmentDate = new Date(assignment.assignment.deadline);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Set to the start of the week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6); // Set to the end of the week (Saturday)
    return assignmentDate >= startOfWeek && assignmentDate <= endOfWeek;
  });

  return (
    <div className="space-y-6">
      {/* <Modal isOpen={true} onClose={() => {}} imageUrl="/notfound.png" /> */}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">
            Welcome to HireTrack
          </CardTitle>
          {user ? (
            user.organizationInfo.name
          ) : (
            <Skeleton className="w-28 h-[16px] rounded-lg" />
          )}
        </CardHeader>
        <CardContent>
          <div className="mt-4 ">
            <h2 className="text-xl font-semibold mb-2">
              {user ? (
                `${user.name}`
              ) : (
                <Skeleton className="w-28 h-[20px] rounded-lg" />
              )}
            </h2>
            {user ? (
              <div className="space-y-2 text-muted-foreground">
                <p>Role: {user.role}</p>
                <p>Email: {user.email}</p>
              </div>
            ) : (
              <div className="space-y-2 text-muted-foreground">
                <div className="flex flex-row justify-start items-center">
                  Email: <Skeleton className="w-28 h-[16px] rounded-lg" />
                </div>
                <div className="flex flex-row justify-start items-center">
                  Role: <Skeleton className="w-28 h-[16px] rounded-lg" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
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
      {/* Today's Interviews */}
      {shouldShowAssignments ? (
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">All Assignments</h2>
          {isLoading ? (
            <DashboardLoader />
          ) : assignments?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments?.map((assignment) => (
                <ActionItems
                  key={assignment.id || assignment._id}
                  assignment={assignment}
                  fetchAssignments={fetchAssignments}
                />
              ))}
            </div>
          ) : (
            <p className="text-lg font-semibold text-gray-500 text-center py-10 w-full flex justify-center items-center">
              No assignments found.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Today&apos;s Interviews</h2>
          {isLoading ? (
            <DashboardLoader />
          ) : todayAssignments?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayAssignments?.map((assignment) => (
                <Card key={assignment.id || Math.random().toString()}>
                  <CardHeader>
                    <CardTitle className="text-lg">{assignment.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Position: {assignment?.jobId?.title || "N/A"}
                      </p>
                      <p
                        className="text-sm text-muted-foreground flex flex-wrap align-center"
                        style={{ alignItems: "center" }}
                      >
                        Skills:{" "}
                        {assignment?.jobId?.skills?.map((skill: string) => (
                          <span
                            className="bg-blue-500 px-2 py-1 m-1 rounded-md text-white"
                            key={skill || Math.random().toString()}
                          >
                            {skill}
                          </span>
                        )) || "N/A"}
                      </p>
                      <p className="text-sm font-semibold capitalize">
                        Status: {assignment?.status || "N/A"}
                      </p>
                      <p className="text-sm font-semibold capitalize">
                        Date:{" "}
                        {new Date(
                          assignment?.assignment?.deadline
                        ).toLocaleDateString() || "N/A"}
                        &nbsp; T{" "}
                        {new Date(
                          assignment?.assignment?.deadline
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) || "N/A"}
                      </p>
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