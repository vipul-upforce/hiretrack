import { CustomCalendarEvent } from "@/app/dashboard/calendar/page";
import { verifyAndDecryptSSE } from "@/lib/auth";
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

  async function getDecodedSSE(encodedData: string) {
    const data: Candidate = await verifyAndDecryptSSE(encodedData);
    return data;
  }

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/sse/candidates?role=${encodeURIComponent(role)}`
    );

    eventSource.onopen = () => {
      // console.log("SSE connection opened");
    };

    eventSource.onmessage = async (event) => {
      try {
        // debugger;
        const data = JSON.parse(event.data);
        if (data.type === "candidateUpdate") {
          const encodedCandidate = data.candidate;
          const updatedCandidate = await getDecodedSSE(encodedCandidate);
          if (!updatedCandidate?._id) {
            console.warn("Invalid candidate data received");
            return;
          }

          // Update the candidates list
          setCandidates((prev) => {
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

          // Update selectedCandidate only if it matches the updated candidate
          if ((selectedCandidate as Candidate)?._id === updatedCandidate._id) {
            if (!pathname?.includes("/calendar")) {
              setSelectedCandidate(updatedCandidate);
            } else {
              // Construct calendar event for calendar views
              const currentEvent = selectedCandidate as CustomCalendarEvent;
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
                  ...currentEvent?.extendedProps,
                  candidate: {
                    ...updatedCandidate,
                    jobId:
                      typeof updatedCandidate.jobId === "string"
                        ? updatedCandidate.jobId
                        : updatedCandidate.jobId?._id,
                    jobDetails:
                      typeof updatedCandidate.jobId === "object"
                        ? {
                            title: updatedCandidate.jobId?.title || "",
                            description:
                              updatedCandidate.jobId?.description || "",
                          }
                        : undefined,
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
          }
        } else if (data.type === "clients") {
          setClients(data.clients);
        } else if (data.type === "lanesUpdate") {
          setLanes(data.lanes);
          // console.log("UPDATED LANES: ", data.lanes);
        } else if (data.type === "multipleCandidateUpdate") {
          debugger;
          const decodedCandidates = await getDecodedSSE(data.candidates);
          const updatedCandidates = Object.values(decodedCandidates);
          // const updatedCandidates = await Promise.all(
          //   candidatesArray.map(async (candidate: any) => {
          //     return await getDecodedSSE(candidate);
          //   })
          // );
          setCandidates((prev: Candidate[]) => {
            const updatedIds = new Set(
              updatedCandidates.map((c: Candidate) => c._id)
            );
            const filtered = prev.filter((c) => !updatedIds.has(c._id));
            return [...filtered, ...updatedCandidates];
          });
        } else if (data.type === "heartbeat") {
          console.log("Heartbeat received");
        } else if (data.type === "connected") {
          // console.log("SSE connected");
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
      // console.log("SSE connection closed");
    };
  }, [role, jobId, pathname]);

  return { candidates, setCandidates, clients, lanes };
};
