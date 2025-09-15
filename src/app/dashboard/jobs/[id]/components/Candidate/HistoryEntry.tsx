import { useState } from "react";
import {
  Dot,
  Star,
  ClipboardCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { RemarkOptionsMenu } from "../Remarks/remark-options-menu";
import AttachmentsPopover from "../Remarks/attachments-popover";
import { ICandidateHistory } from "@/lib/models/history";
import { Candidate } from "@/types/candidate";
import { User } from "@/lib/features/users/usersApi";
import { IEditRemark } from "../../schemas/EditRemarkDialog";
import useRoles from "@/hooks/useRoles";
import FollowupDisplay from "../Remarks/followup-popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// import { useDateFormatter } from "@/components/timezoneFormat/useGetFormattedTZ";

// Component to display checklist responses
const ChecklistResponseViewer = ({
  checklistForm
}: {
  checklistForm: ICandidateHistory["checklistForm"];
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const role = useRoles()
  if (!checklistForm) return null;

  // Debug: Log the structure to understand the data format
  // console.log("ChecklistForm structure:", checklistForm);
  // console.log("Responses type:", typeof checklistForm.responses);
  // console.log(
  //   "Responses instanceof Map:",
  //   checklistForm.responses instanceof Map
  // );
  // console.log("Responses data:", checklistForm.responses);

  // Handle both Map and plain object formats
  const responsesArray =
    checklistForm.responses instanceof Map
      ? Array.from(checklistForm.responses.entries())
      : Object.entries(checklistForm.responses || {});

  // 🔑 Filter by role visibility
  const visibleResponses = responsesArray.filter(([key, resp]: [string, any]) =>
    Array.isArray(resp?.visibleInHistory)
      ? resp.visibleInHistory.includes(role) // show only if role is allowed
      : true // if visibleInHistory missing, default visible
  );
  const formatValue = (value: any, fieldType: string) => {
    if (value === null || value === undefined) return "N/A";

    switch (fieldType) {
      case "checkbox":
        if (Array.isArray(value)) {
          return value.join(", ");
        }
        return value ? "Yes" : "No";
      case "multiSelect":
        return Array.isArray(value) ? value.join(", ") : String(value);
      case "date":
        return value ? new Date(value).toLocaleDateString() : "N/A";
      case "time":
        return value || "N/A";
      case "datetime":
        return value ? new Date(value).toLocaleString() : "N/A";
      case "password":
        return value ? "••••••••" : "N/A";
      case "file":
        if (Array.isArray(value) && value.length > 0) {
          return (
            <div className="space-y-2">
              {value.map((file: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded p-2"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      // Create download link
                      const link = document.createElement("a");
                      link.href = file.base64;
                      link.download = file.name;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          );
        }
        return "No files uploaded";
      default:
        return String(value);
    }
  };

  return (
    <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-black/50">
      <div
        className="p-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
              {checklistForm.checklistName}
            </span>
          </div>
          <div className="h-6 w-6 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Completed for {checklistForm.laneName} lane
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 space-y-3">
          {visibleResponses
            .filter(([_, response]) => {
              const responseData =
                (response as { value: string })?.value !== undefined
                  ? response
                  : response;
              const value = (responseData as { value: string })?.value;
              if (
                (typeof value === "string" && value.trim() === "") ||
                (Array.isArray(value) && value.length === 0) ||
                !value
              ) {
                return false;
              }
              return true;
            })
            .map(([fieldId, response]) => {
              // Handle both formats: response could be the response object or nested
              const responseData =
                (response as { value: string })?.value !== undefined
                  ? response
                  : response;
              const fieldLabel =
                (responseData as { fieldLabel: string })?.fieldLabel || fieldId;
              const fieldType =
                (responseData as { fieldType: string })?.fieldType || "text";
              const value = (responseData as { value: string })?.value;

              // if (value.trim() === "" || !value){
              //   return;
              // }
              return (
                <div
                  key={fieldId}
                  className="border-l-2 border-blue-200 dark:border-blue-800 pl-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        {fieldLabel}
                      </label>
                      <div className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                        {formatValue(value, fieldType)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          {responsesArray.length === 0 && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
              No responses recorded
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const RenderHistoryEntry = ({
  interview,
  indexKey,
  localCandidate,
  user,
  timeDate,
  timeTime,
  handleRemarkUpdate,
  setEditingRemark,
  setIsEditRemarkDialogOpen,
}: {
  interview: ICandidateHistory;
  indexKey: number;
  localCandidate: Candidate;
  user: User | null;
  timeDate: string;
  timeTime: string;
  handleRemarkUpdate: (
    id: string,
    description: string,
    isPrivate?: boolean
  ) => void;
  setEditingRemark: ({ }: IEditRemark | null) => void;
  setIsEditRemarkDialogOpen: (x: boolean) => void;
}) => {
  const [isRemarkOptionsOpen, setIsRemarkOptionsOpen] = useState(false);
  const [isRemarkOpsOpenFor, setIsRemarkOpsOpenFor] = useState<string | null>();
  const [isNoteOpsOpenFor, setIsNoteOpsOpenFor] = useState<string | null>();

  const role = useRoles();
  const isLogTableEntry =
    interview.note &&
    interview.note.description &&
    typeof interview.note.description !== "string";
  // const { formatTZDate } = useDateFormatter();
  if (
    interview.checklistForm &&
    Object.keys(interview.checklistForm.responses).length === 0
  ) {
    return null;
  }
  // console.log(interview, "interview Historuy");

  // Convert timeDate string to Date object for formatTZDate
  // const dateObj = new Date(timeDate);

  // Format the date using the user's timezone
  // const formattedDate = formatTZDate(dateObj);

  // Helper function to determine the entry title
  const renderEntryTitle = () => {
    if (
      (interview.title !== "" || !interview.title) &&
      interview.title !== "Assigned to Job" &&
      !interview.title?.includes("Followup") &&
      !interview.title?.startsWith("Direct Email") &&
      !interview.title?.startsWith("Email sent: ") &&
      !interview.checklistForm
    ) {
      return (
        <div className="flex flex-row items-start justify-between w-full">
          <div className="flex flex-row w-[85%]">
            {interview.currentInterviewer &&
              typeof interview.currentInterviewer === "object" &&
              "name" in interview.currentInterviewer ? (
              <>
                {interview.previousInterviewer &&
                  typeof interview.previousInterviewer === "object" &&
                  "name" in interview.previousInterviewer ? (
                  <p className="pl-1">
                    {interview.previousInterviewer.name +
                      " → " +
                      interview.currentInterviewer.name}
                  </p>
                ) : (
                  <p className="pl-1">
                    {`Assigned to ${interview.currentInterviewer.name}`}
                  </p>
                )}
              </>
            ) : interview.remark && interview.remark.description ? (
              <p>{interview.title || "Remark Added"}</p>
            ) : interview.title === "Candidate Added" &&
              interview.assignmentBy ? (
              <p>
                {localCandidate.name} was added by{" "}
                {interview.assignmentBy &&
                  typeof interview.assignmentBy === "object" &&
                  "name" in interview.assignmentBy
                  ? `${interview.assignmentBy.name}`
                  : ""}
              </p>
            ) : interview.title === "Self Applied" ? (
              <p>{localCandidate.name} applied from portal</p>
            ) : interview.title?.includes("Updated") ? (
              <p>{interview.title}</p>
            ) : interview.title === "Archived" ? (
              <p>{localCandidate.name} was Archived</p>
            ) : interview.title === "Unarchived" ? (
              <p>{localCandidate.name} was Unarchived</p>
            ) : interview?.previousInterviewer ? (
              <p className="pl-1">
                Unassigned from{" "}
                {interview?.previousInterviewer &&
                  typeof interview.previousInterviewer === "object" &&
                  "name" in interview.previousInterviewer &&
                  interview.previousInterviewer.name}
              </p>
            ) : (
              <></>
            )}
          </div>
          <div className="flex flex-col items-end text-right">
            <p className="text-xs font-light text-gray-400">
              {interview?.assignmentBy && "Updated by"}
            </p>
            <p className="font-light text-gray-500 text-sm">
              {interview.assignmentBy &&
                typeof interview.assignmentBy === "object" &&
                "name" in interview?.assignmentBy
                ? `${interview?.assignmentBy.name}`
                : ""}
            </p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex flex-row items-start justify-between w-full">
          {interview.title}
          {interview.assignmentBy && (
            <div className="flex flex-col items-end text-right">
              <p className="text-xs font-light text-gray-400">
                {interview?.assignmentBy && "Updated by"}
              </p>
              <p className="font-light text-gray-500 text-sm">
                {interview.assignmentBy &&
                  typeof interview.assignmentBy === "object" &&
                  "name" in interview?.assignmentBy
                  ? `${interview?.assignmentBy.name}`
                  : ""}
              </p>
            </div>
          )}
        </div>
      );
    }
  };
  if (isLogTableEntry) {
    return;
  }
  return (
    <div key={indexKey} className="mb-10 ms-4 group">
      <div className="absolute w-3 h-3 bg-gray-200 rounded-full mt-1.5 -start-1.5 border border-white dark:border-gray-900 dark:bg-gray-700"></div>

      <div
        className="flex flex-row items-center justify-between group"
        onMouseEnter={() => {
          setIsRemarkOptionsOpen(true);
          setIsRemarkOpsOpenFor(interview.remark?.id);
        }}
        onMouseLeave={() => {
          setIsRemarkOptionsOpen(false);
        }}
      >
        <time className="mb-1 text-sm font-normal leading-none text-gray-400 dark:text-gray-500 flex flex-row items-center group">
          {/* {typeof formattedDate === "string"
            ? formattedDate
            : formattedDate.toString()}{" "}
          <Dot /> {timeTime} */}
          {timeDate} <Dot /> {timeTime}
        </time>
        {/* <div className="relative">
          {interview.remark?.description &&
            interview.remark?.id === isRemarkOpsOpenFor &&
            interview.assignmentBy &&
            typeof interview.assignmentBy === "object" &&
            "_id" in interview.assignmentBy &&
            (role !== "interviewer" ||
              interview.assignmentBy?._id === user?.id) &&
            (role !== "hr" ||
              interview.assignmentBy?._id === user?.id) &&
            user?.role !== "candidate" && (
              // (user?.role === "hr" || user?.role === "admin") && (
              <RemarkOptionsMenu
                isOpen={
                  isRemarkOptionsOpen &&
                  interview.remark?.id === isRemarkOpsOpenFor
                }
                setIsOpen={(open) => {
                  setIsRemarkOptionsOpen(open);
                  setIsRemarkOpsOpenFor(open ? interview.remark?.id || "" : "");
                }}
                remarkId={interview.remark?.id || ""}
                isPrivate={interview.remark?.isPrivate || false}
                onTogglePrivacy={async (id, isPrivate) => {
                  try {
                    await handleRemarkUpdate(
                      id,
                      interview.remark?.description || "",
                      isPrivate
                    );
                  } catch (error) {
                    console.error("Failed to toggle privacy:", error);
                  }
                }}
                onEdit={(id) => {
                  if (interview.remark) {
                    setEditingRemark({
                      id: interview.remark.id,
                      description: interview.remark.description,
                      isPrivate: interview.remark.isPrivate || false,
                      rating: interview.remark.rating,
                    });
                    setIsEditRemarkDialogOpen(true);
                  }
                }}
              />
            )}
        </div> */}
        <div className="relative">
          {/* ✅ Remark options */}
          {interview.remark?.description &&
            interview.remark?.id === isRemarkOpsOpenFor &&
            interview.assignmentBy &&
            typeof interview.assignmentBy === "object" &&
            "_id" in interview.assignmentBy &&
            (role !== "interviewer" ||
              interview.assignmentBy?._id === user?.id) &&
            (role !== "hr" ||
              interview.assignmentBy?._id === user?.id) &&
            user?.role !== "candidate" && (
              <RemarkOptionsMenu
                type="remark"
                remarkId={interview.remark?.id || ""}
                isPrivate={interview.remark?.isPrivate || false}
                onTogglePrivacy={async (id, isPrivate) => {
                  await handleRemarkUpdate(
                    id,
                    interview.remark?.description || "",
                    isPrivate
                  );
                }}
                onEdit={(id) => {
                  if (interview.remark) {
                    setEditingRemark({
                      id: interview.remark.id,
                      description: interview.remark.description,
                      isPrivate: interview.remark.isPrivate || false,
                      rating: interview.remark.rating,
                    });
                    setIsEditRemarkDialogOpen(true);
                  }
                }}
                isOpen={isRemarkOptionsOpen && interview.remark?.id === isRemarkOpsOpenFor}
                setIsOpen={(open) => {
                  setIsRemarkOptionsOpen(open);
                  setIsRemarkOpsOpenFor(open ? interview.remark?.id || "" : "");
                }}
              />

            )}

          {/* ✅ Note options */}
          {(interview.title?.includes("Followup") ? interview.note : interview.note?.description) &&
          // interview.note?.description &&
           interview.assignmentBy &&
            typeof interview.assignmentBy === "object" &&
            "_id" in interview.assignmentBy &&
            (role !== "interviewer" ||
              interview.assignmentBy?._id === user?.id) &&
                 (role !== "hr" ||
              interview.assignmentBy?._id === user?.id) &&
            user?.role !== "candidate" && (() => {
              return (
                <RemarkOptionsMenu
                  type="note"
                  remarkId={interview?._id}
                  onEdit={(id) => {
                    if (interview.note && typeof interview.note.description === "string") {
                      setEditingRemark({
                        id: interview?._id,
                        description: interview.note.description, // safe now
                        isPrivate: interview.remark.isPrivate || false,
                        rating: interview.note.rating,
                      });
                      setIsEditRemarkDialogOpen(true);
                    }
                  }}
                  isOpen={interview?._id === isNoteOpsOpenFor}
                  setIsOpen={(open) => {
                    // setIsNoteOptionsOpen(open);
                    setIsRemarkOptionsOpen(open);
                    setIsNoteOpsOpenFor(open ? interview?._id : "");
                  }}
                />
              );
            })()}

        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize flex flex-row items-center justify-start">
        {renderEntryTitle()}
      </h3>

      <div className="mb-4 text-base font-normal text-gray-500 dark:text-gray-400 flex flex-row justify-between items-start w-[full] text-wrap break-all">
        <p
          className="max-w-[90%] text-sm whitespace-pre-wrap pb-0"
          style={{ wordWrap: "break-word" }}
        >
          {/* {interview.note &&
            !interview.currentInterviewer &&
            interview.note.description &&
            (() => {
              const description = interview.note.description || "";
              const index = description.indexOf(":");

              const title =
                index !== -1 ? description.slice(0, index).trim() : "";
              const rest =
                index !== -1
                  ? description.slice(index + 1).trim()
                  : description;

              return (
                <>
                  <span className="text-black text-lg">
                    {title.charAt(0).toUpperCase() + title.slice(1)}
                  </span>
                  <span>{rest}</span>
                </>
              );
            })()} */}

          {interview.note &&
            typeof interview.note.description === "string" &&
            interview.note.description}
          {interview.remark && interview.remark.description}
        </p>

        {interview?.note &&
          Object.keys(interview.note).length > 0 &&
          // interview?.note?.rating &&
          interview?.note?.rating !== 0 &&
          interview?.note?.rating ? (
          <div className="flex flex-row items-center">
            {interview?.note?.rating}/5
            <Star
              size={"15px"}
              className="mt-[1px]"
              style={{ color: "orange" }}
            />
          </div>
        ) : null}
        {interview.remark &&
          interview.remark.rating &&
          interview.remark.rating != 0 && (
            <div className="flex flex-row items-center">
              {interview.remark.rating}/5
              <Star
                size={"15px"}
                className="mt-[1px]"
                style={{ color: "orange" }}
              />
            </div>
          )}
      </div>
      {interview.title?.startsWith("Followup") &&
        interview.note &&
        interview.note.date && (
          <FollowupDisplay
            note={interview.note.description as string}
            date={new Date(interview.note.date)}
            showToolTip={false}
          />
        )}
      <AttachmentsPopover
        attachments={interview.attachments}
        onMoreClick={() => null}
      />

      {/* Show checklist responses if present */}
      <ChecklistResponseViewer checklistForm={interview.checklistForm} />
    </div>
  );
};

export default RenderHistoryEntry;
