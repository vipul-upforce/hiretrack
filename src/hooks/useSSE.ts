import { CustomCalendarEvent } from "@/app/dashboard/calendar/page";
import { verifyAndDecrypCaptcha, verifyAndDecryptSSE } from "@/lib/auth";
import { Candidate } from "@/types/candidate";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Cookies from "js-cookie";

export async function getDecodedSSE(encodedData: string) {
  console.log(encodedData, "encodedData");
  const orgId = Cookies.get("org_id");
  console.log(orgId, "orgId in getDecodedSSE");

  try {
    const data = await verifyAndDecryptSSE(encodedData, orgId);
    return data;
  } catch (error) {
    console.error("SSE decryption error:", error);
    return null;
  }
}
export async function getDecodedCaptcha(encodedData: string, orgId: string) {
  try {
    const data = await verifyAndDecrypCaptcha(encodedData, orgId);
    // console.log(data, "verifyAndDecrypCaptcha");
    return data;
  } catch (error) {
    console.error("SSE decryption error:", error);
    return null;
  }
}
export const useSSE = (
  role: string,
  setSelectedCandidate: any,
  selectedCandidate: Candidate | CustomCalendarEvent | null,
  jobId?: string
) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [clients, setClients] = useState<number>();
  const [lanes, setLanes] = useState<string[]>();
  const [isConnected, setIsConnected] = useState(true); // Track connection status
  const eventSourceRef = useRef<EventSource | null>(null); // Ref to access EventSource
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
    //   selectedCandidate,
    //   selectedCandidateId: selectedId,
    // });
    selectedCandidateRef.current = selectedCandidate;
    setSelectedCandidateRef.current = setSelectedCandidate;
    // setCurrentCandidate(selectedCandidate);
  }, [selectedCandidate, setSelectedCandidate]);

  // useEffect(() => {
  //   const eventSource = new EventSource(
  //     `/api/sse/candidates?role=${encodeURIComponent(role)}`
  //   );

  // Function to create and set up EventSource
  const setupEventSource = () => {
    const eventSource = new EventSource(
      `/api/sse/candidates?role=${encodeURIComponent(role)}`
    );
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log("SSE connection opened");
    };

    // eventSource.onopen = () => {};

    eventSource.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        // debugger;
        if (data.type === "candidateUpdate") {
          const encodedCandidate = data.candidate;
          const updatedCandidate = await getDecodedSSE(encodedCandidate);
          console.log("Decoded candidate:", {
            updatedCandidateId: updatedCandidate?._id,
            status: updatedCandidate.status,
            updatedCandidate,
          });

          if (!updatedCandidate || !updatedCandidate._id) {
            console.warn("Invalid candidate data received:", updatedCandidate);
            return;
          }

          setCandidates((prev) => {
            // debugger
            const index = prev.findIndex((c) => c._id === updatedCandidate._id);
            if (index >= 0) {
              return [
                ...prev.slice(0, index),
                updatedCandidate,
                ...prev.slice(index + 1),
              ];
            }
            //   updatedCandidateId: updatedCandidate?._id,
            //   status: updatedCandidate.status,
            //   updatedCandidate,
            // })
            return [...prev, updatedCandidate];
          });

          // setTimeout(() => {
          // debugger;
          const currentSelected = selectedCandidateRef.current;
          let currentSelectedId: string | undefined;
          if (currentSelected) {
            if (pathname?.includes("/calendar")) {
              currentSelectedId =
                (currentSelected as CustomCalendarEvent)?.extendedProps
                  ?.candidate?._id || (currentSelected as any)?._def?.publicId;
            } else {
              currentSelectedId = (currentSelected as Candidate)?._id;
            }
          }

          //   currentSelectedId,
          //   updatedCandidateId: updatedCandidate._id,
          // });

          if (currentSelected && currentSelectedId === updatedCandidate._id) {
            if (!pathname?.includes("/calendar")) {
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
              setSelectedCandidateRef.current(updatedEvent);
            }
          } else {
            //   currentSelectedId,
            //   updatedCandidateId: updatedCandidate._id,
            // });
          }
          // }, 500);
        } else if (data.type === "clients") {
          setClients(data.clients);
        } else if (data.type === "lanesUpdate") {
          setLanes(data.lanes);
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

    // eventSource.onerror = (error) => {
    //   console.error("SSE error:", error);
    //   eventSource.close();
    // };

    // return () => {
    //   eventSource.close();
    // };
    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      setIsConnected(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      // Immediately attempt to reconnect on accidental close
      console.log("Detected accidental close - attempting to reconnect SSE...");
      setupEventSource();
    };

    return eventSource;
  };
  useEffect(() => {
    const es = setupEventSource();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setIsConnected(false);
      eventSourceRef.current = null;
    };
  }, [role, jobId, pathname]);

  return { candidates, setCandidates, clients, lanes, isConnected };
};
