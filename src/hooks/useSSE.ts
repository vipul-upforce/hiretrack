import { CustomCalendarEvent } from "@/app/dashboard/calendar/page";
import { Candidate } from "@/types/candidate";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// interface ClientInfo {
//   id: number;
//   connectedAt: string;
//   role?: string;
// }

export const useSSE = (
  role: string,
  setSelectedCandidate: any,
  selectedCandidate: Candidate | CustomCalendarEvent | null,
  jobId?: string
) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [clients, setClients] = useState<number>();
  const [lanes, setLanes] = useState<string[]>();

  const [currentCandidate, setCurrentCandidate] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    setCurrentCandidate(selectedCandidate);
  }, [selectedCandidate, jobId, role]);

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/sse/candidates?role=${encodeURIComponent(role)}`
    );

    eventSource.onopen = () => {
      console.log("SSE connection opened");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "candidateUpdate") {
          setCandidates((prev) => {
            const updatedCandidate = data.candidate;
            const index = prev.findIndex((c) => c._id === updatedCandidate._id);
            if (index >= 0) {
              return [
                ...prev.slice(0, index),
                updatedCandidate,
                ...prev.slice(index + 1),
              ];
            }
            return [...prev, updatedCandidate];
          });
          //   debugger;
          setTimeout(() => {
            if (!pathname?.includes("/calendar")) {
              setSelectedCandidate(data.candidate);
            } else {
              const currentEvent = currentCandidate;
              const updatedCandidate = data.candidate;
              const startTime = updatedCandidate?.assignment?.time
                ? new Date(updatedCandidate?.assignment?.time)
                : currentEvent?.start || new Date();
              const endTime = updatedCandidate?.assignment?.time
                ? new Date(updatedCandidate?.assignment?.time)
                : currentEvent?.end || new Date();

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
            }
          }, 800);
          if (
            !pathname?.includes("/calendar") &&
            currentCandidate?._id === data.candidate._id
          ) {
            setSelectedCandidate(data.candidate);
          }
        } else if (data.type === "clients") {
          setClients(data.clients);
        } else if (data.type === "lanesUpdate") {
          setLanes(data.lanes);
          console.log("UPDATED LANES: ", data.lanes);
        } else if (data.type === "multipleCandidateUpdate") {
          setCandidates((prev: Candidate[]) => {
            const updated = data.candidates;
            const updatedIds = new Set(updated.map((c: Candidate) => c._id));
            const filtered = prev.filter((c) => !updatedIds.has(c._id));
            return [...filtered, ...updated];
          });

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
  }, [role, jobId]);

  return { candidates, setCandidates, clients, lanes };
};
