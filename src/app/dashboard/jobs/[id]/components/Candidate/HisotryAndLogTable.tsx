import RenderHistoryEntry from "../Candidate/HistoryEntry";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Candidate } from "@/types/candidate";
import { ICandidateHistory, IinfoUpdateLog } from "@/lib/models/history";
import { IEditRemark } from "../../schemas/EditRemarkDialog";
import { useState } from "react";
import { formatDate, formatTime } from "../../hooks/dateTimeFormatting";
import { User } from "@/lib/features/users/usersApi";
import { ListTree, TableIcon } from "lucide-react";
import AttachmentsPopover from "../Remarks/attachments-popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const HistoryAndLogTable: React.FC<{
  candidate: Candidate;
  user: User | null;
  timeLineItems: ICandidateHistory[];
  handleRemarkUpdate: (
    id: string,
    description: string,
    isPrivate?: boolean
  ) => void;
  setEditingRemark: React.Dispatch<React.SetStateAction<IEditRemark | null>>;
  setIsEditRemarkDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showHeader?: boolean;
}> = ({
  candidate,
  user,
  timeLineItems,
  handleRemarkUpdate,
  setEditingRemark,
  setIsEditRemarkDialogOpen,
  showHeader = true,
}) => {
  const [showLogTable, setShowLogTable] = useState(false);

  const tableRows = timeLineItems
    .sort(
      (a, b) =>
        new Date(b?.dateTime ?? 0).getTime() -
        new Date(a?.dateTime ?? 0).getTime()
    )
    .filter((interview) => {
      if (!interview.remark || !interview.remark.description) {
        return true;
      }
      return (
        !interview.remark.isPrivate ||
        user?.role === "hr" ||
        user?.role === "admin"
      );
    })
    .flatMap((interview, i) => {
      const timeDate = formatDate(interview.dateTime);
      const timeTime = formatTime(interview.dateTime);
      if (
        typeof interview.currentInterviewer === "object" &&
        interview.currentInterviewer &&
        "email" in interview.currentInterviewer &&
        typeof interview.previousInterviewer === "object" &&
        interview.previousInterviewer &&
        "email" in interview.previousInterviewer &&
        interview.currentInterviewer !== null &&
        interview.currentInterviewer?.email ===
          interview.previousInterviewer?.email &&
        (!interview.note || !interview.note.description)
      ) {
        return [];
      }
      const isLogTableEntry =
        interview.note &&
        interview.note.description &&
        Array.isArray(interview.note.description);
      if (!isLogTableEntry) return [];

      return (interview.note.description as IinfoUpdateLog[]).map(
        (log: IinfoUpdateLog, logIndex) => (
          <TableRow
            key={`${i}-${logIndex}-${interview.dateTime}`}
            className="border-b border-gray-200 dark:border-gray-700"
          >
            <TableCell className="p-2 w-[250px] text-gray-700 dark:text-gray-300">
              {logIndex === 0 ? `${timeDate} ${timeTime}` : ""}
            </TableCell>
            <TableCell className="p-2 w-[250px] text-gray-700 dark:text-gray-300">
              {log.title.replace("Updated ", "") ?? log.title ?? "N/A"}
            </TableCell>
            <TableCell className="p-2 max-w-[200px] break-words whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {(!log.attachments &&
                JSON.stringify(log.previousValue as string)
                  ?.replaceAll('"', "")
                  ?.replace("~", "")) ??
                "N/A"}
            </TableCell>
            <TableCell className="p-2 max-w-[250px] break-words whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {log.attachments && log.attachments.length > 0 ? (
                <AttachmentsPopover
                  attachments={log.attachments.map((file, index) => ({
                    id: `${i}-${logIndex}-${index}-${file.name}`,
                    name: file.name,
                    url: file.url || "#",
                    type: file.type,
                    size: file.size,
                  }))}
                  onMoreClick={() => null}
                />
              ) : (
                ""
              )}
              {(!log.attachments &&
                JSON.stringify(log.currentValue as string)
                  .replaceAll('"', "")
                  .replace("~", "")) ??
                "N/A"}
            </TableCell>
            <TableCell className="p-2 w-[250px] break-words whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {typeof interview.assignmentBy === "object" &&
              interview.assignmentBy &&
              "name" in interview.assignmentBy &&
              typeof interview.assignmentBy.name === "string"
                ? interview.assignmentBy.name
                : ""}
            </TableCell>
            {/* <TableCell className="p-2 w-[50px]">
          {log.attachments && log.attachments.length > 0 ? (
            <AttachmentsPopover
              attachments={log.attachments.map(
                (file, index) => ({
                  id: `${i}-${logIndex}-${index}-${file.name}`,
                  name: file.name,
                  url: file.url || "#",
                  type: file.type,
                  size: file.size,
                })
              )}
              onMoreClick={() => null}
            />
          ) : (
            ""
          )}
        </TableCell> */}
          </TableRow>
        )
      );
    });
  if (user?.role === "candidate") return null;
  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <Label className="font-semibold text-lg flex items-center gap-2">
            {showLogTable && user?.role !== "interviewer"
              ? "Candidate Update Logs"
              : "Candidate History"}
          </Label>

          {user?.role !== "interviewer" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                user?.role !== "interviewer" && setShowLogTable((prev) => !prev)
              }
            >
              {showLogTable ? (
                <>
                  <ListTree className="h-4 w-4 mr-2" />
                  Show Activities
                </>
              ) : (
                <>
                  <TableIcon className="h-4 w-4 mr-2" />
                  Show Logs
                </>
              )}
            </Button>
          )}
        </div>
      )}
      {showLogTable ? (
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800">
          <div className="overflow-x-auto">
            {tableRows.length > 0 ? (
              <Table className="w-[130%] text-sm">
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-gray-700">
                    <TableHead className="p-2 font-bold text-left w-[150px] text-gray-900 dark:text-gray-100">
                      Updated At
                    </TableHead>
                    <TableHead className="p-2 font-bold text-left w-[150px] text-gray-900 dark:text-gray-100">
                      Fields Updated
                    </TableHead>
                    <TableHead className="p-2 font-bold text-left w-[200px] text-gray-900 dark:text-gray-100">
                      Previous
                    </TableHead>
                    <TableHead className="p-2 font-bold text-left w-[200px] text-gray-900 dark:text-gray-100">
                      Updated
                    </TableHead>
                    <TableHead className="p-2 font-bold text-left w-[150px] text-gray-900 dark:text-gray-100">
                      Updated By
                    </TableHead>
                    {/* <TableHead className="p-2 font-bold text-left w-[150px]">
                    Added Attachments
                  </TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.length > 0 ? (
                    tableRows
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5} // Reduced colSpan to 5 since we're showing only up to Updated By
                        className="p-2 text-center text-gray-500"
                      >
                        Candidate Info Updates Will Be Listed Here
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ) : (
              <div className="w-full text-center text-gray-700">
                No Logs Yet.
              </div>
            )}
          </div>
        </div>
      ) : (
        <ol className="relative border-s border-gray-200 dark:border-gray-700">
          {timeLineItems.length > 0
            ? timeLineItems
                .sort(
                  (a, b) =>
                    new Date(b?.dateTime ?? 0).getTime() -
                    new Date(a?.dateTime ?? 0).getTime()
                )
                .filter((interview) => {
                  // debugger;
                  if (!interview.remark || !interview.remark.description) {
                    return true;
                  }
                  return (
                    !interview.remark.isPrivate ||
                    user?.role === "hr" ||
                    user?.role === "admin"
                  );
                })
                .map((interview, i) => {
                  const timeDate = formatDate(interview.dateTime);
                  const timeTime = formatTime(interview.dateTime);
                  if (
                    typeof interview.currentInterviewer === "object" &&
                    interview.currentInterviewer &&
                    "email" in interview.currentInterviewer &&
                    typeof interview.previousInterviewer === "object" &&
                    interview.previousInterviewer &&
                    "email" in interview.previousInterviewer &&
                    interview.currentInterviewer !== null &&
                    interview.currentInterviewer?.email ===
                      interview.previousInterviewer?.email &&
                    (!interview.note || !interview.note.description)
                  ) {
                    return null;
                  }
                  if (
                    user?.role === "interviewer" &&
                    interview.title?.toLowerCase().includes("followup")
                  )
                    return null;
                  return (
                    <RenderHistoryEntry
                      interview={interview}
                      indexKey={i}
                      localCandidate={candidate}
                      user={user}
                      timeDate={timeDate}
                      timeTime={timeTime}
                      handleRemarkUpdate={handleRemarkUpdate}
                      setEditingRemark={setEditingRemark}
                      setIsEditRemarkDialogOpen={setIsEditRemarkDialogOpen}
                      key={i}
                    />
                  );
                })
            : "No History"}
        </ol>
      )}
    </div>
  );
};

export const LogsTable: React.FC<{
  candidate: Candidate;
  user: User | null;
  timeLineItems: ICandidateHistory[];
}> = ({ candidate, user, timeLineItems }) => {
  const tableRows = timeLineItems
    .sort(
      (a, b) =>
        new Date(b?.dateTime ?? 0).getTime() -
        new Date(a?.dateTime ?? 0).getTime()
    )
    .filter((interview) => {
      if (!interview.remark || !interview.remark.description) {
        return true;
      }
      return (
        !interview.remark.isPrivate ||
        user?.role === "hr" ||
        user?.role === "admin"
      );
    })
    .flatMap((interview, i) => {
      const timeDate = formatDate(interview.dateTime);
      const timeTime = formatTime(interview.dateTime);
      if (
        typeof interview.currentInterviewer === "object" &&
        interview.currentInterviewer &&
        "email" in interview.currentInterviewer &&
        typeof interview.previousInterviewer === "object" &&
        interview.previousInterviewer &&
        "email" in interview.previousInterviewer &&
        interview.currentInterviewer !== null &&
        interview.currentInterviewer?.email ===
          interview.previousInterviewer?.email &&
        (!interview.note || !interview.note.description)
      ) {
        return [];
      }
      const isLogTableEntry =
        interview.note &&
        interview.note.description &&
        Array.isArray(interview.note.description);
      if (!isLogTableEntry) return [];

      return (interview.note.description as IinfoUpdateLog[]).map(
        (log: IinfoUpdateLog, logIndex) => (
          <TableRow
            key={`${i}-${logIndex}-${interview.dateTime}`}
            className="border-b border-gray-200 dark:border-gray-700"
          >
            <TableCell className="p-2 w-[250px] text-gray-700 dark:text-gray-300">
              {logIndex === 0 ? `${timeDate} ${timeTime}` : ""}
            </TableCell>
            <TableCell className="p-2 w-[250px] text-gray-700 dark:text-gray-300">
              {log.title.replace("Updated ", "") ?? log.title ?? "N/A"}
            </TableCell>
            <TableCell className="p-2 max-w-[200px] break-words whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {(!log.attachments &&
                JSON.stringify(log.previousValue as string)
                  ?.replaceAll('"', "")
                  ?.replace("~", "")) ??
                "N/A"}
            </TableCell>
            <TableCell className="p-2 max-w-[250px] break-words whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {log.attachments && log.attachments.length > 0 ? (
                <AttachmentsPopover
                  attachments={log.attachments.map((file, index) => {
                    return {
                      id: `${i}-${logIndex}-${index}-${file.name}`,
                      name: file.name,
                      url: file.url || file.base64 || "#",
                      type: file.type,
                      size: file.size,
                    };
                  })}
                  onMoreClick={() => null}
                />
              ) : (
                ""
              )}
              {(!log.attachments &&
                JSON.stringify(log.currentValue as string)
                  .replaceAll('"', "")
                  .replace("~", "")) ??
                "N/A"}
            </TableCell>
            <TableCell className="p-2 w-[250px] break-words whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {typeof interview.assignmentBy === "object" &&
              interview.assignmentBy &&
              "name" in interview.assignmentBy &&
              typeof interview.assignmentBy.name === "string"
                ? interview.assignmentBy.name
                : ""}
            </TableCell>
          </TableRow>
        )
      );
    });

  return (
    <div className="space-y-4">
      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800">
        <div className="overflow-x-auto">
          {tableRows.length > 0 ? (
            <Table className="w-[130%] text-sm">
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-gray-700">
                  <TableHead className="p-2 font-bold text-left w-[150px] text-gray-900 dark:text-gray-100">
                    Updated At
                  </TableHead>
                  <TableHead className="p-2 font-bold text-left w-[150px] text-gray-900 dark:text-gray-100">
                    Fields Updated
                  </TableHead>
                  <TableHead className="p-2 font-bold text-left w-[200px] text-gray-900 dark:text-gray-100">
                    Previous
                  </TableHead>
                  <TableHead className="p-2 font-bold text-left w-[200px] text-gray-900 dark:text-gray-100">
                    Updated
                  </TableHead>
                  <TableHead className="p-2 font-bold text-left w-[150px] text-gray-900 dark:text-gray-100">
                    Updated By
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.length > 0 ? (
                  tableRows
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="p-2 text-center text-gray-500"
                    >
                      Candidate Info Updates Will Be Listed Here
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <div className="w-full text-center text-gray-700 dark:text-gray-300">
              No Logs Yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
