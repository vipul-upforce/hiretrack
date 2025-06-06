import { useState } from "react";
import { Dot, Star } from "lucide-react";
import { RemarkOptionsMenu } from "../Remarks/remark-options-menu";
import AttachmentsPopover from "../Remarks/attachments-popover";
import { ICandidateHistory } from "@/lib/models/history";
import { Candidate } from "@/types/candidate";
import { User } from "@/lib/features/users/usersApi";
import { IEditRemark } from "../../schemas/EditRemarkDialog";
import useRoles from "@/hooks/useRoles";
// import { useDateFormatter } from "@/components/timezoneFormat/useGetFormattedTZ";

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
  setEditingRemark: ({}: IEditRemark | null) => void;
  setIsEditRemarkDialogOpen: (x: boolean) => void;
}) => {
  const [isRemarkOptionsOpen, setIsRemarkOptionsOpen] = useState(false);
  const [isRemarkOpsOpenFor, setIsRemarkOpsOpenFor] = useState<string | null>();
  const role = useRoles();
  const isLogTableEntry =
    interview.note &&
    interview.note.description &&
    typeof interview.note.description !== "string";
  // const { formatTZDate } = useDateFormatter();

  // Convert timeDate string to Date object for formatTZDate
  // const dateObj = new Date(timeDate);

  // Format the date using the user's timezone
  // const formattedDate = formatTZDate(dateObj);

  // Helper function to determine the entry title
  const renderEntryTitle = () => {
    if (
      (interview.title !== "" || !interview.title) &&
      interview.title !== "Assigned to Job"
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
      return interview.title;
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
        <div className="relative">
          {interview.remark?.description &&
            interview.remark?.id === isRemarkOpsOpenFor &&
            interview.assignmentBy &&
            typeof interview.assignmentBy === "object" &&
            "_id" in interview.assignmentBy &&
            (role !== "interviewer" ||
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

      <AttachmentsPopover
        attachments={interview.attachments}
        onMoreClick={() => null}
      />
    </div>
  );
};

export default RenderHistoryEntry;
