import { CustomCalendarEvent } from "@/app/dashboard/calendar/page";
import { verifyAndDecryptSSE } from "@/lib/auth";
import { Candidate } from "@/types/candidate";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export const useSSE = (
  role: string,
  setSelectedCandidate: any,
  selectedCandidate: Candidate | CustomCalendarEvent | null,
  jobId?: string
) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [clients, setClients] = useState<number>();
  const [lanes, setLanes] = useState<string[]>();
  // const [currentCandidate, setCurrentCandidate] = useState<
  //   Candidate | CustomCalendarEvent | null
  // >(null);
  const pathname = usePathname();

  // Use refs to store the latest setSelectedCandidate and selectedCandidate
  const selectedCandidateRef = useRef<Candidate | CustomCalendarEvent | null>(
    selectedCandidate
  );
  const setSelectedCandidateRef = useRef(setSelectedCandidate);

  // Update refs and currentCandidate whenever selectedCandidate or setSelectedCandidate changes
  useEffect(() => {
    // const selectedId =
    //   (selectedCandidate as Candidate)?._id ||
    //   (selectedCandidate as CustomCalendarEvent)?.extendedProps?.candidate
    //     ?._id ||
    //   (selectedCandidate as any)?._def?.publicId;
    // console.log("Updating refs and currentCandidate:", {
    //   selectedCandidate,
    //   selectedCandidateId: selectedId,
    // });
    selectedCandidateRef.current = selectedCandidate;
    setSelectedCandidateRef.current = setSelectedCandidate;
    // setCurrentCandidate(selectedCandidate);
  }, [selectedCandidate, setSelectedCandidate]);

  useEffect(() => {
    // console.log("Opening SSE connection with role:", role, "jobId:", jobId);
    const eventSource = new EventSource(
      `/api/sse/candidates?role=${encodeURIComponent(role)}`
    );

    eventSource.onopen = () => {
      console.log("SSE connection opened");
    };

    eventSource.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        // console.log("Received SSE event:", data);
        // debugger;
        if (data.type === "candidateUpdate") {
          const encodedCandidate = data.candidate;
          const updatedCandidate = await getDecodedSSE(encodedCandidate);
          // console.log("Decoded candidate:", {
          //   updatedCandidateId: updatedCandidate?._id,
          //   updatedCandidate,
          // });

          if (!updatedCandidate || !updatedCandidate._id) {
            // console.warn("Invalid candidate data received:", updatedCandidate);
            return;
          }

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

          setTimeout(() => {
            // debugger;
            const currentSelected = selectedCandidateRef.current;
            let currentSelectedId: string | undefined;
            if (currentSelected) {
              if (pathname?.includes("/calendar")) {
                currentSelectedId =
                  (currentSelected as CustomCalendarEvent)?.extendedProps
                    ?.candidate?._id ||
                  (currentSelected as any)?._def?.publicId;
              } else {
                currentSelectedId = (currentSelected as Candidate)?._id;
              }
            }

            // console.log("Comparing IDs:", {
            //   currentSelectedId,
            //   updatedCandidateId: updatedCandidate._id,
            // });

            if (currentSelected && currentSelectedId === updatedCandidate._id) {
              // console.log("Matched selected candidate, updating...");
              if (!pathname?.includes("/calendar")) {
                // console.log(
                //   "Updating non-calendar selected candidate:",
                //   updatedCandidate
                // );
                setSelectedCandidateRef.current(updatedCandidate);
              } else {
                // Construct calendar event for calendar views
                const currentEvent = currentSelected as CustomCalendarEvent;
                const startTime = updatedCandidate?.assignment?.time
                  ? new Date(updatedCandidate?.assignment?.time)
                  : currentEvent?.start || new Date();
                const endTime = updatedCandidate?.assignment?.time
                  ? new Date(
                      new Date(startTime).setHours(startTime.getHours() + 1)
                    ) // Default to 1-hour duration
                  : currentEvent?.end || new Date();

                const updatedEvent: CustomCalendarEvent = {
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
                };
                // console.log("Updating calendar event:", updatedEvent);
                setSelectedCandidateRef.current(updatedEvent);
              }
            } else {
              // console.log("No match for selected candidate:", {
              //   currentSelectedId,
              //   updatedCandidateId: updatedCandidate._id,
              // });
            }
          }, 500);
        } else if (data.type === "clients") {
          setClients(data.clients);
        } else if (data.type === "lanesUpdate") {
          setLanes(data.lanes);
          console.log("UPDATED LANES:", data.lanes);
        } else if (data.type === "multipleCandidateUpdate") {
          const decodedCandidates = await getDecodedSSE(data.candidates);
          if (!decodedCandidates) {
            console.warn(
              "Invalid multiple candidate data received:",
              decodedCandidates
            );
            return;
          }
          const updatedCandidates = Object.values(
            decodedCandidates
          ) as Candidate[];
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
      // console.log("SSE connection closed due to error");
    };

    return () => {
      eventSource.close();
      // console.log("SSE connection closed on cleanup");
    };
  }, [role, jobId, pathname]);

  async function getDecodedSSE(encodedData: string) {
    try {
      const data = await verifyAndDecryptSSE(encodedData);
      return data;
    } catch (error) {
      console.error("SSE decryption error:", error);
      return null;
    }
  }

  return { candidates, setCandidates, clients, lanes };
};
