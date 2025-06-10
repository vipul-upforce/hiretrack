import {
  CandidateAssignment,
  CustomCalendarEvent,
} from "@/app/dashboard/calendar/page";
import { Candidate } from "@/types/candidate";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export const useSSE = (
  role: string,
  setSelectedCandidate: any,
  selectedCandidate: Candidate | CustomCalendarEvent | null,
  jobId?: string
) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [clients, setClients] = useState<number>();
  const [lanes, setLanes] = useState<string[]>();
  const pathname = usePathname();

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/sse/candidates?role=${encodeURIComponent(role)}`
    );

    eventSource.onopen = () => {
      console.log("SSE connection opened on candidates-board");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "candidateUpdate") {
          const updatedCandidate = data.candidate as CandidateAssignment;

          // Update candidates list
          setCandidates((prev: any) => {
            const index = prev.findIndex(
              (c: any) => c._id === updatedCandidate._id
            );
            if (index >= 0) {
              return [
                ...prev.slice(0, index),
                updatedCandidate,
                ...prev.slice(index + 1),
              ];
            }
            return [...prev, updatedCandidate];
          });

          // Update selected candidate if it matches
          if (
            selectedCandidate &&
            ((selectedCandidate as CustomCalendarEvent).extendedProps?.candidate
              ?._id === updatedCandidate._id ||
              (selectedCandidate as Candidate)._id === updatedCandidate._id)
          ) {
            if (
              pathname?.includes("/calendar") ||
              pathname?.endsWith("/dashboard")
            ) {
              // For calendar page, update the full CustomCalendarEvent
              const currentEvent = selectedCandidate as CustomCalendarEvent;
              const startTime = updatedCandidate?.assignment?.time
                ? new Date(updatedCandidate?.assignment?.time)
                : currentEvent.start || new Date();
              const endTime = updatedCandidate?.assignment?.time
                ? new Date(updatedCandidate?.assignment?.time)
                : currentEvent.end || new Date();

              setSelectedCandidate({
                ...currentEvent,
                id: updatedCandidate._id,
                title:
                  typeof updatedCandidate.jobId === "object"
                    ? updatedCandidate.jobId?.title || "Unknown"
                    : "Unknown",
                start: startTime,
                end: endTime,
                startStr: startTime.toISOString(),
                endStr: endTime.toISOString(),
                extendedProps: {
                  ...currentEvent.extendedProps,
                  candidate: {
                    ...updatedCandidate,
                    jobId:
                      typeof updatedCandidate.jobId === "string"
                        ? updatedCandidate.jobId
                        : updatedCandidate.jobId?._id,
                    jobDetails:
                      typeof updatedCandidate.jobId === "string"
                        ? undefined
                        : {
                            title: updatedCandidate.jobId?.title || "",
                            description:
                              updatedCandidate.jobId?.description || "",
                          },
                  },
                  interviewer:
                    typeof updatedCandidate?.assignment?.interviewerId ===
                    "string"
                      ? {
                          _id: updatedCandidate?.assignment?.interviewerId,
                          name: "Unknown",
                          email: "Unknown",
                        }
                      : updatedCandidate?.assignment?.interviewerId || {
                          _id: "",
                          name: "Unknown",
                          email: "Unknown",
                        },
                },
              });
            } else {
              // For non-calendar pages, update as Candidate
              setSelectedCandidate(updatedCandidate);
            }
          }
        } else if (data.type === "multipleCandidateUpdate") {
          // Update candidates list
          setCandidates((prev: any) => {
            const updated = data.candidates as CandidateAssignment[];
            const updatedIds = new Set(updated.map((c) => c._id));
            const filtered = prev.filter((c: any) => !updatedIds.has(c._id));
            return [...filtered, ...updated];
          });

          // Update selected candidate if it matches any updated candidate
          if (selectedCandidate) {
            const updatedCandidate = (
              data.candidates as CandidateAssignment[]
            ).find(
              (c: CandidateAssignment) =>
                c._id ===
                ((selectedCandidate as CustomCalendarEvent).extendedProps
                  ?.candidate?._id || (selectedCandidate as Candidate)._id)
            );
            if (updatedCandidate) {
              if (
                pathname?.includes("/calendar") ||
                pathname?.endsWith("/dashboard")
              ) {
                // For calendar page, update the full CustomCalendarEvent
                const currentEvent = selectedCandidate as CustomCalendarEvent;
                const startTime = updatedCandidate?.assignment?.time
                  ? new Date(updatedCandidate?.assignment?.time)
                  : currentEvent.start || new Date();
                const endTime = updatedCandidate?.assignment?.time
                  ? new Date(updatedCandidate?.assignment?.time)
                  : currentEvent.end || new Date();

                setSelectedCandidate({
                  ...currentEvent,
                  id: updatedCandidate._id,
                  title:
                    typeof updatedCandidate.jobId === "object"
                      ? updatedCandidate.jobId?.title || "Unknown"
                      : "Unknown",
                  start: startTime,
                  end: endTime,
                  startStr: startTime.toISOString(),
                  endStr: endTime.toISOString(),
                  extendedProps: {
                    ...currentEvent.extendedProps,
                    candidate: {
                      ...updatedCandidate,
                      jobId:
                        typeof updatedCandidate.jobId === "string"
                          ? updatedCandidate.jobId
                          : updatedCandidate.jobId?._id,
                      jobDetails:
                        typeof updatedCandidate.jobId === "string"
                          ? undefined
                          : {
                              title: updatedCandidate.jobId?.title || "",
                              description:
                                updatedCandidate.jobId?.description || "",
                            },
                    },
                    interviewer:
                      typeof updatedCandidate?.assignment?.interviewerId ===
                      "string"
                        ? {
                            _id: updatedCandidate?.assignment?.interviewerId,
                            name: "Unknown",
                            email: "Unknown",
                          }
                        : updatedCandidate?.assignment?.interviewerId || {
                            _id: "",
                            name: "Unknown",
                            email: "Unknown",
                          },
                  },
                });
              } else {
                // For non-calendar pages, update as Candidate
                setSelectedCandidate(updatedCandidate);
              }
            }
          }
        } else if (data.type === "clients") {
          setClients(data.clients);
        } else if (data.type === "lanesUpdate") {
          setLanes(data.lanes);
          console.log("UPDATED LANES: ", data.lanes);
        } else if (data.type === "heartbeat") {
          console.log("Heartbeat received");
        } else if (data.type === "connected") {
          console.log("SSE connected");
        }
      } catch (error) {
        console.error("Error parsing SSE event:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      console.log("SSE connection closed");
    };
  }, [role, jobId, selectedCandidate, setSelectedCandidate, pathname]);

  return { candidates, setCandidates, clients, lanes };
};
