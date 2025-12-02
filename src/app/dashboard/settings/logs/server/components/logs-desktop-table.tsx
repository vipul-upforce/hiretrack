import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Eye } from "lucide-react";
import {
  formatDate,
  formatTime,
} from "@/app/dashboard/jobs/[id]/hooks/dateTimeFormatting";
import { LogEntry } from "../types";

interface LogsDesktopTableProps {
  logs: LogEntry[];
  renderTitle: (log: LogEntry) => React.ReactNode;
  onViewDetails: (id: string) => void;
}

export function LogsDesktopTable({
  logs,
  renderTitle,
  onViewDetails,
}: LogsDesktopTableProps) {
  return (
    <div className="hidden md:block overflow-x-auto px-4">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <TableRow className="hover:bg-transparent">
            <TableHead className="min-w-[220px] text-xs uppercase tracking-wider text-muted-foreground">
              Title
            </TableHead>
            <TableHead className="min-w-[200px] text-xs uppercase tracking-wider text-muted-foreground">
              Candidate
            </TableHead>
            <TableHead className="min-w-[220px] text-xs uppercase tracking-wider text-muted-foreground">
              Job
            </TableHead>
            <TableHead className="min-w-[160px] text-xs uppercase tracking-wider text-muted-foreground">
              Date
            </TableHead>
            <TableHead className="min-w-[160px] text-xs uppercase tracking-wider text-muted-foreground">
              Updated By
            </TableHead>
            <TableHead className="text-right min-w-[100px] text-xs uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log, i) => (
            <TableRow
              onClick={() => onViewDetails(log.candidateId)}
              key={`${log.candidateId}-${i}`}
              className="group hover:bg-muted/50 cursor-pointer even:bg-muted/30"
            >
              <TableCell className="align-top">
                <div className="max-w-[420px] space-y-1">
                  <div className="font-medium truncate">{renderTitle(log)}</div>
                  {log.note?.description &&
                    typeof log.note.description === "string" && (
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {log.note.description}
                      </div>
                    )}
                </div>
              </TableCell>
              <TableCell className="align-top">
                <div className="flex flex-col">
                  <span className="font-medium truncate">
                    {log.candidateData?.name || "Unknown"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {log.candidateData?.email || "—"}
                  </span>
                </div>
              </TableCell>
              <TableCell className="align-top">
                <div className="flex flex-col">
                  <span className="font-medium truncate">
                    {log.jobData?.title || "—"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {(log.jobData?.skills || []).slice(0, 3).join(", ") || "—"}
                  </span>
                </div>
              </TableCell>
              <TableCell className="align-top">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{formatDate(log.dateTime)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatTime(log.dateTime)}
                </div>
              </TableCell>
              <TableCell className="align-top">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {log?.assignmentBy.length
                      ? log?.assignmentBy[0]?.name
                      : "SELF"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {log?.assignmentBy.length
                      ? log?.assignmentBy[0]?.email
                      : log?.candidateData?.email}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right align-top">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(log.candidateId);
                  }}
                  aria-label="View details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
