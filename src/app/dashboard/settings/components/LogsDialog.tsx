"use client";

import React, { useState, useEffect, useRef, ComponentType } from "react";
import type { SettingComponentProps } from "./setting-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Candidate, Remark } from "@/types/candidate";
import { Job } from "@/types/job";
import { Star } from "lucide-react";
import FollowupDisplay from "../../jobs/[id]/components/Remarks/followup-popover";
import AttachmentsPopover from "../../jobs/[id]/components/Remarks/attachments-popover";
import {
  formatDate,
  formatTime,
} from "../../jobs/[id]/hooks/dateTimeFormatting";
import { Button } from "@/components/ui/button";

interface LogEntry {
  candidateId: string;
  jobId: string;
  candidateData: Candidate;
  jobData: Job;
  dateTime: string;
  assignmentBy: any;
  currentInterviewer: {
    _id: string;
    name: string;
    email: string;
    role: string;
  }[];
  remark: Remark;
  previousInterviewer: {
    _id: string;
    name: string;
    email: string;
    role: string;
  }[];
  title: string;
  note: { description: string; date: string; rating: number; userId: string[] };
  attachments: any[];
}

const LogsDialog: ComponentType<SettingComponentProps> = ({
  isOpen,
  onClose,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [nginxFiles, setNginxFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [totalLines, setTotalLines] = useState(0);
  const [activeTab, setActiveTab] = useState<"nginx" | "server">("nginx");
  const [isNginxAvailable, setIsNginxAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLn, setShowLn] = useState(false);
  const [searchClick, setSearchClick] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const linesPerLoad = 100;
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setNginxFiles([]);
      setSelectedFile(null);
      setFileContent([]);
      setLogs([]);
      setSearchQuery("");
      setOffset(0);
      setTotalLines(0);
      setIsNginxAvailable(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    if (activeTab === "nginx") {
      if (searchQuery) {
        setIsLoading(false);
        return;
      }
      fetch("/api/nginx-logs")
        .then((res) => {
          console.log(res, "nginx");

          if (!res.ok) throw new Error("Failed to fetch nginx logs");
          return res.json();
        })
        .then((data) => {
          setIsNginxAvailable(data.files && data.files.length > 0);
          setNginxFiles(data.files || []);
        })
        .catch((err) => {
          setError("Error fetching nginx logs: " + err.message);
          console.log(err, "nginx");

          setIsNginxAvailable(false);
        })
        .finally(() => setIsLoading(false));
    } else if (activeTab === "server") {
      const queryParam = searchQuery
        ? `&query=${encodeURIComponent(searchQuery)}`
        : "";
      if (!searchClick) {
        setIsLoading(false);
        return;
      }
      setSearchClick(false);
      fetch(`/api/logs?offset=${offset}&limit=${linesPerLoad}${queryParam}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch history logs");
          return res.json();
        })
        .then((data) => {
          setLogs(data.logs || []);
          setOffset((data.offset || 0) + (data.logs?.length || 0));
          setTotalLines(data.totalLines || 0);
        })
        .catch((err) => {
          setError("Error fetching history logs: " + err.message);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, activeTab, searchQuery, searchClick]);
  useEffect(() => {
    if (activeTab !== "server") return;

    setIsLoading(true);
    setError(null);
    setLogs([]);
    setOffset(0);

    const queryParam = searchQuery
      ? `&query=${encodeURIComponent(searchQuery)}`
      : "";
    fetch(`/api/logs?offset=0&limit=${linesPerLoad}${queryParam}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch history logs");
        return res.json();
      })
      .then((data) => {
        setLogs(data.logs || []);
        setOffset((data.offset || 0) + (data.logs?.length || 0));
        setTotalLines(data.totalLines || 0);
      })
      .catch((err) => {
        setError("Error fetching history logs: " + err.message);
      })
      .finally(() => setIsLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (!isOpen || (offset >= totalLines && totalLines !== 0) || isLoading)
      return;

    const scrollToBottom = () => {
      if (logContainerRef.current) {
        const container = logContainerRef.current;
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      }
    };
    // debugger;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          setIsLoading(true);
          const queryParam = searchQuery
            ? `&query=${encodeURIComponent(searchQuery)}`
            : "";
          const url =
            activeTab === "nginx"
              ? `/api/nginx-logs/${selectedFile}?offset=${offset}&limit=${linesPerLoad}${queryParam}`
              : `/api/logs?offset=${offset}&limit=${linesPerLoad}${queryParam}`;

          fetch(url)
            .then((res) => {
              if (!res.ok) throw new Error("Failed to fetch more logs");
              return res.json();
            })
            .then((data) => {
              if (activeTab === "nginx") {
                setFileContent((prev) => [...prev, ...(data.content || [])]);
              } else {
                setLogs((prev) => [...prev, ...(data.logs || [])]);
              }
              setOffset(
                (data.offset || 0) +
                (data.logs?.length || data.content?.length || 0)
              );
              setTotalLines(data.totalLines || 0);
              scrollToBottom();
            })
            .catch((err) => {
              setError("Error fetching more logs: " + err.message);
            })
            .finally(() => setIsLoading(false));
        }
      },
      { root: logContainerRef.current, threshold: 0.1, rootMargin: "1000px" }
    );

    const sentinel = document.getElementById("log-sentinel");
    if (sentinel) observer.observe(sentinel);

    return () => {
      if (sentinel) observer.unobserve(sentinel);
    };
  }, [activeTab, selectedFile, offset, totalLines, isLoading, searchQuery]);

  useEffect(() => {
    if (!isOpen || !selectedFile || activeTab !== "nginx") return;

    setIsLoading(true);
    setSearchClick(false);
    setError(null);
    setFileContent([]);
    setOffset(0);

    const queryParam = searchQuery
      ? `&query=${encodeURIComponent(searchQuery)}`
      : "";
    fetch(
      `/api/nginx-logs/${selectedFile}?offset=0&limit=${linesPerLoad}${queryParam}`
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch file content");
        return res.json();
      })
      .then((data) => {
        setFileContent(data.content || []);
        setOffset((data.offset || 0) + (data.content?.length || 0));
        setTotalLines(data.totalLines || 0);
      })
      .catch((err) => {
        setError("Error fetching file content: " + err.message);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, activeTab, selectedFile, searchQuery]);

  const renderEntryTitle = (log: LogEntry) => {
    const assignmentBy = log.assignmentBy[0]?.name || "";
    if (
      (log.title !== "" || !log.title) &&
      log.title !== "Assigned to Job" &&
      !log.title?.includes("Followup")
    ) {
      return (
        <div className="flex flex-row items-start justify-between w-full">
          <div className="flex flex-row w-[85%]">
            {log.currentInterviewer.length > 0 ? (
              <>
                {log.previousInterviewer.length > 0 ? (
                  <p className="pl-1">
                    {`${log.previousInterviewer[0].name} → ${log.currentInterviewer[0].name}`}
                  </p>
                ) : (
                  <p className="pl-1">{`Assigned to ${log.currentInterviewer[0].name}`}</p>
                )}
              </>
            ) : log.candidateData?.remarks &&
              log.candidateData?.remarks?.length > 0 ? (
              <p>{log.title || "Remark Added"}</p>
            ) : log.title === "Candidate Added" && assignmentBy ? (
              <p>
                {log.candidateData?.name} was added by {assignmentBy || ""}
              </p>
            ) : log.title === "Self Applied" ? (
              <p>{log.candidateData?.name} applied from portal</p>
            ) : log.title?.includes("Updated") ? (
              <p>{log.title}</p>
            ) : log.title === "Aarhived" ? (
              <p>{log.candidateData?.name} was Archived</p>
            ) : log.title === "Unarchived" ? (
              <p>{log.candidateData?.name} was Unarchived</p>
            ) : log.previousInterviewer.length > 0 ? (
              <p className="pl-1">
                Unassigned from {log.previousInterviewer[0]?.name}
              </p>
            ) : (
              <></>
            )}
          </div>
          {assignmentBy && (
            <div className="flex flex-col items-end text-right">
              <p className="text-xs font-light text-muted-foreground">
                Updated by
              </p>
              <p className="font-light text-muted-foreground text-sm">
                {assignmentBy}
              </p>
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div className="flex flex-row items-start justify-between w-full">
          <p>{log.title}</p>
          {assignmentBy && (
            <div className="flex flex-col items-end text-right">
              <p className="text-xs font-light text-muted-foreground">
                Updated by
              </p>
              <p className="font-light text-muted-foreground text-sm">
                {assignmentBy}
              </p>
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col font-sans">
      {/* Tabs */}
      <div className="flex border-b mb-6 flex-shrink-0 justify-between">
        <div className="flex space-x-2">
          <button
            className={`py-2 px-4 text-sm font-medium rounded-t-md transition-colors ${activeTab === "nginx"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:bg-gray-100"
              }`}
            onClick={() => {
              setActiveTab("nginx");
              setSearchQuery("");
              setOffset(0);
              setTotalLines(0);
              setShowDetails(null);
            }}
            aria-selected={activeTab === "nginx"}
          >
            Nginx Logs
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium rounded-t-md transition-colors ${activeTab === "server"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:bg-gray-100"
              }`}
            onClick={() => {
              setActiveTab("server");
              setSearchQuery("");
              setOffset(0);
              setTotalLines(0);
              setShowDetails(null);
            }}
            aria-selected={activeTab === "server"}
          >
            History Logs
          </button>
        </div>
        {error && (
          <div className="text-red-500 px-4 flex items-center text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Nginx Logs Tab */}
        {activeTab === "nginx" && (
          <div className="flex-1 flex min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 min-h-0">
              {/* File List */}
              <div className="col-span-1 flex flex-col min-h-0">
                <h3 className="font-bold text-sm mb-2 flex-shrink-0">
                  Log Files ({nginxFiles.length})
                </h3>
                <div className="flex-1 overflow-y-auto min-h-0">
                  {isNginxAvailable ? (
                    <ul className="space-y-1">
                      {nginxFiles.map((file) => (
                        <li
                          key={file}
                          className={`cursor-pointer p-2 text-sm rounded ${selectedFile === file
                              ? "bg-blue-100 text-blue-700"
                              : "hover:bg-gray-100"
                            }`}
                          onClick={() => {
                            setSelectedFile(file);
                            setSearchQuery("");
                            setOffset(0);
                            setTotalLines(0);
                          }}
                        >
                          {file}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-gray-500 text-sm">
                      No Nginx log files available.
                    </div>
                  )}
                </div>
              </div>

              {/* Log Content */}
              <div className="col-span-3 flex flex-col min-h-0">
                {selectedFile ? (
                  <>
                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                      <div className="flex flex-row items-center w-[70%]">
                        <h3 className="font-bold text-sm mr-4">
                          {selectedFile}
                        </h3>
                        <input
                          type="text"
                          placeholder="Search logs..."
                          value={searchQuery}
                          onChange={(e) => {
                            if (
                              e.target.value !== "(" &&
                              e.target.value !== ")"
                            ) {
                              setSearchQuery(e.target.value);
                              setOffset(0);
                              setTotalLines(0);
                              setFileContent([]);
                            }
                          }}
                          className="border rounded-lg px-4 py-2 text-sm w-full max-w-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {isLoading && !fileContent.length && (
                          <div className="px-4">
                            <div className="flex items-center justify-center">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary"></div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-row items-center">
                        <Checkbox
                          checked={showLn}
                          onChange={() => setShowLn(!showLn)}
                        />
                        <p className="text-sm">Show Line Numbers</p>
                      </div>
                    </div>
                    <div
                      className={`bg-muted p-4 rounded-md flex-1 overflow-y-auto min-h-0 ${isLoading && "border-b-red-500"}`}
                      ref={logContainerRef}
                    >
                      {fileContent.length > 0 ? (
                        <pre className="whitespace-pre-wrap text-sm">
                          {fileContent.map((line, index) => {
                            const parts = searchQuery
                              ? line.split(new RegExp(`(${searchQuery})`, "gi"))
                              : [line];
                            return (
                              <div
                                key={`${offset}-${index}`}
                                className="border-b border-border py-1 flex flex-row items-center"
                              >
                                {showLn && (
                                  <p className="text-sm text-muted-foreground mr-2">
                                    {index + 1}
                                  </p>
                                )}
                                <p className="flex-1">
                                  {parts.map((part, i) =>
                                    part.toLowerCase() ===
                                      searchQuery.toLowerCase() ? (
                                      <mark
                                        key={i}
                                        className="bg-blue-200 rounded-[3px]"
                                      >
                                        {part}
                                      </mark>
                                    ) : (
                                      <span key={i}>{part}</span>
                                    )
                                  )}
                                </p>
                              </div>
                            );
                          })}
                          <div id="log-sentinel" className="h-1" />
                        </pre>
                      ) : (
                        <div className="text-gray-500 text-sm">
                          {searchQuery && !isLoading
                            ? "No logs match the search query."
                            : !searchQuery
                              ? "No content available."
                              : "Loading..."}
                        </div>
                      )}
                      {isLoading && fileContent.length > 0 && (
                        <div className="text-center text-gray-500 py-2">
                          Loading more logs...
                        </div>
                      )}
                      {offset >= totalLines && fileContent.length > 0 && (
                        <div className="text-center text-gray-500 py-2">
                          All logs loaded.
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-gray-500 text-sm flex-1 flex items-center justify-center">
                    Select a file to view its contents.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Server Logs Tab */}
        {activeTab === "server" && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="mb-4 flex-shrink-0">
              <input
                type="text"
                placeholder="Search logs by candidate, job title, email, skills, or remarks..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setOffset(0);
                  setTotalLines(0);
                  // setLogs([]);
                }}
                className="w-full max-w-md border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button className="ml-2" onClick={() => setSearchClick(true)}>
                Search
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto" ref={logContainerRef}>
              {isLoading && !logs.length ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner />
                </div>
              ) : logs.length > 0 ? (
                <div className="space-y-4">
                  {logs.map((log, i) => (
                    <div
                      key={`${log.candidateId}-${i}`}
                      className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div
                        className="flex justify-between items-center cursor-pointer"
                        onClick={() =>
                          setShowDetails(
                            showDetails === log.candidateId + i
                              ? null
                              : log.candidateId + i
                          )
                        }
                      >
                        <div className="w-full">
                          <h3 className="text-sm font-semibold text-gray-800">
                            {renderEntryTitle(log)}
                          </h3>
                          <div className="mb-4 text-base font-normal text-gray-500 dark:text-gray-400 flex flex-row justify-between items-start w-[full] text-wrap break-all">
                            <p
                              className="max-w-[90%] text-sm whitespace-pre-wrap pb-0"
                              style={{ wordWrap: "break-word" }}
                            >
                              {log.note &&
                                typeof log.note.description === "string" &&
                                log.note.description}
                              {log.remark && log.remark.description}
                            </p>
                            {log?.note &&
                              Object.keys(log.note).length > 0 &&
                              log?.note?.rating !== 0 &&
                              log?.note?.rating ? (
                              <div className="flex flex-row items-center">
                                {log?.note?.rating}/5
                                <Star
                                  size={"15px"}
                                  className="mt-[1px]"
                                  style={{ color: "orange" }}
                                />
                              </div>
                            ) : null}
                            {log.remark &&
                              log.remark.rating &&
                              log.remark.rating != 0 && (
                                <div className="flex flex-row items-center">
                                  {log.remark.rating}/5
                                  <Star
                                    size={"15px"}
                                    className="mt-[1px]"
                                    style={{ color: "orange" }}
                                  />
                                </div>
                              )}
                          </div>
                          <div className="mb-2">
                            {log.title?.startsWith("Followup") &&
                              log.note &&
                              log.note.date && (
                                <FollowupDisplay
                                  note={log.note.description as string}
                                  date={new Date(log.note.date)}
                                  showToolTip={false}
                                />
                              )}
                            <AttachmentsPopover
                              attachments={log.attachments}
                              onMoreClick={() => null}
                            />
                          </div>
                          <p className="text-xs text-gray-500">
                            {formatTime(log.dateTime)}{" "}
                            {formatDate(log.dateTime)} | Candidate:{" "}
                            {log.candidateData?.name || "N/A"}
                          </p>
                        </div>
                      </div>
                      {showDetails === log.candidateId + i && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-700">
                              Candidate Details
                            </h4>
                            <p>
                              <span className="font-medium">Name:</span>{" "}
                              {log.candidateData?.name || "N/A"}
                            </p>
                            <p>
                              <span className="font-medium">Email:</span>{" "}
                              {log.candidateData?.email || "N/A"}
                            </p>
                            <p>
                              <span className="font-medium">Location:</span>{" "}
                              {log.candidateData?.location || "N/A"}
                            </p>
                            <p>
                              <span className="font-medium">Experience:</span>{" "}
                              {log.candidateData?.experience || 0} years
                            </p>
                            <p>
                              <span className="font-medium">Skills:</span>{" "}
                              {log.candidateData?.skills?.join(", ") || "N/A"}
                            </p>
                            <p>
                              <span className="font-medium">Status:</span>{" "}
                              <span
                                className={`capitalize ${log.candidateData?.status === "rejected"
                                    ? "text-red-500"
                                    : "text-green-500"
                                  }`}
                              >
                                {log.candidateData?.status || "N/A"}
                              </span>
                            </p>
                            {/* <p>
                              <span className="font-medium">Remarks:</span>{" "}
                              {log?.candidateData?.remarks &&
                              log?.candidateData?.remarks?.length > 0
                                ? log.candidateData.remarks.map((r, i) => (
                                    <div key={i}>
                                      <span key={r.date} className="block">
                                        {r.description} (
                                        {new Date(r.date).toLocaleString()})
                                      </span>
                                      <div>Remark by: {r.userId}</div>
                                    </div>
                                  ))
                                : "None"}
                            </p> */}
                            <a
                              target="_blank"
                              href={`/candidate/${log.candidateData._id}`}
                              className="text-sm text-primary hover:underline"
                            >
                              View All Details
                            </a>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-700">
                              Job Details
                            </h4>
                            <p>
                              <span className="font-medium">Title:</span>{" "}
                              {log.jobData?.title || "N/A"}
                            </p>
                            <p>
                              <span className="font-medium">Skills:</span>{" "}
                              {log.jobData?.skills?.join(", ") || "N/A"}
                            </p>
                            <p>
                              <span className="font-medium">Experience:</span>{" "}
                              {log.jobData?.experience || 0} years
                            </p>
                            <p>
                              <span className="font-medium">Status:</span>{" "}
                              <span
                                className={`capitalize ${log.jobData?.status === "open"
                                    ? "text-green-500"
                                    : "text-gray-500"
                                  }`}
                              >
                                {log.jobData?.status || "N/A"}
                              </span>
                            </p>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-700">
                              Interviewer Details
                            </h4>
                            <p>
                              <span className="font-medium">
                                Current Interviewer:
                              </span>{" "}
                              {log.currentInterviewer.length > 0
                                ? log.currentInterviewer
                                  .map((i) => i.name)
                                  .join(", ")
                                : "None"}
                            </p>
                            <p>
                              <span className="font-medium">
                                Previous Interviewer:
                              </span>{" "}
                              {log.previousInterviewer.length > 0
                                ? log.previousInterviewer
                                  .map((i) => i.name)
                                  .join(", ")
                                : "None"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div id="log-sentinel" className="h-1" />
                </div>
              ) : (
                <div className="text-gray-500 text-sm flex-1 flex items-center justify-center">
                  {searchQuery && !isLoading
                    ? "No logs match the search query."
                    : "No history logs available."}
                </div>
              )}
              {isLoading && logs.length > 0 && (
                <div className="text-center text-gray-500 py-2">
                  Loading more logs...
                </div>
              )}
              {offset >= totalLines && logs.length > 0 && (
                <div className="text-center text-gray-500 py-2">
                  All logs loaded.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsDialog;
