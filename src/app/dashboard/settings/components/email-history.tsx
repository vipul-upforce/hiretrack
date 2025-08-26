"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Mail,
  Calendar,
  User,
  Paperclip,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  AlertCircle,
  Eye,
  Download,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { EmailHistoryRecord } from "../../email-history/page";
// import  EmailHistoryRecord  from "../../email-history/page";

export function EmailHistory() {
  const [emails, setEmails] = useState<EmailHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedEmail, setSelectedEmail] = useState<EmailHistoryRecord | null>(
    null
  );
  const [refreshing, setRefreshing] = useState(false);

  const fetchEmailHistory = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(search && { search }),
        ...(statusFilter !== "all" && statusFilter && { status: statusFilter }),
      });

      const response = await fetch(`/api/email-history?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch email history");
      }

      const data = await response.json();
      setEmails(data.emails);
      setTotalPages(data.pagination.total);
      setPageSize(20);
    } catch (error) {
      toast.error("Failed to load email history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmailHistory();
  }, [page, search, statusFilter]);
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Mail className="h-4 w-4 text-gray-600" />;
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6" />
          Email History
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchEmailHistory(true)}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex gap-4 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by subject, sender, or recipient..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : emails?.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No emails found</p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Sent By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Attachments</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emails.map((email) => (
                <TableRow key={email._id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(email.status)}
                      {getStatusBadge(email.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {email.recipientName ||
                          email.recipientEmail ||
                          "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {email.recipientEmail || "No email"}
                      </span>
                      {((email.cc && email.cc.length > 0) ||
                        (email.bcc && email.bcc.length > 0)) && (
                        <span className="text-xs text-muted-foreground">
                          {email.cc &&
                            email.cc.length > 0 &&
                            `CC: ${email.cc.length}`}
                          {email.cc &&
                            email.cc.length > 0 &&
                            email.bcc &&
                            email.bcc.length > 0 &&
                            ", "}
                          {email.bcc &&
                            email.bcc.length > 0 &&
                            `BCC: ${email.bcc.length}`}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px] truncate font-medium">
                      {email.subject || "No subject"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {email.sentByName || email.sentByEmail || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {email.sentByEmail || "No email"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {format(new Date(email.createdAt), "MMM dd, yyyy")}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(email.createdAt), "HH:mm")}
                    </div>
                  </TableCell>
                  <TableCell>
                    {email.attachments && email.attachments.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {email.attachments.length}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        None
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEmail(email)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Email Detail Dialog */}
      <Dialog
        open={!!selectedEmail}
        onOpenChange={() => setSelectedEmail(null)}
      >
        <DialogContent className="!max-w-none !w-full !h-full !left-0 !top-0 !translate-x-0 !translate-y-0 min-w-0 lg:!max-w-[70vw] lg:!min-w-[800px] lg:!h-[85vh] lg:!left-[50%] lg:!top-[50%] lg:!translate-x-[-50%] lg:!translate-y-[-50%] xl:!max-w-[60vw] overflow-hidden flex flex-col">
          <DialogHeader className="px-6 pt-6 pr-12 border-b border-gray-200 dark:border-gray-700 pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
                <Mail className="h-6 w-6" />
                Email Details
              </DialogTitle>
              {selectedEmail && (
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedEmail.status)}
                  {getStatusBadge(selectedEmail.status)}
                </div>
              )}
            </div>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Complete email information and audit trail
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {selectedEmail && (
              <div className="bg-white dark:bg-black">
                {/* Email Header - Like Gmail */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
                        {selectedEmail.subject || "No subject"}
                      </h1>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        {selectedEmail.attachments &&
                          selectedEmail.attachments.length > 0 && (
                            <Paperclip className="h-4 w-4" />
                          )}
                        <span>
                          {format(
                            new Date(selectedEmail.createdAt),
                            "MMM dd, yyyy, h:mm a"
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                      {(
                        selectedEmail.sentByName ||
                        selectedEmail.sentByEmail ||
                        "U"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {selectedEmail.sentByName || "Unknown"}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          &lt;{selectedEmail.sentByEmail}&gt;
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span>
                          to{" "}
                          {selectedEmail.recipientName ||
                            selectedEmail.recipientEmail}
                        </span>
                        {((selectedEmail.cc && selectedEmail.cc.length > 0) ||
                          (selectedEmail.bcc &&
                            selectedEmail.bcc.length > 0)) && (
                          <span className="ml-2">
                            {selectedEmail.cc &&
                              selectedEmail.cc.length > 0 && (
                                <span>cc: {selectedEmail.cc.join(", ")}</span>
                              )}
                            {selectedEmail.bcc &&
                              selectedEmail.bcc.length > 0 && (
                                <span className="ml-2">
                                  bcc: {selectedEmail.bcc.join(", ")}
                                </span>
                              )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email Body */}
                <div className="px-6 py-6">
                  <div className="prose prose-sm max-w-none text-gray-900 dark:text-gray-100">
                    {/* Render HTML content or plain text */}
                    {selectedEmail.body ? (
                      // Check if content is HTML by looking for HTML tags
                      selectedEmail.body.includes("<") &&
                      selectedEmail.body.includes(">") ? (
                        <div
                          className="leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: selectedEmail.body,
                          }}
                        />
                      ) : (
                        // Plain text - preserve line breaks
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {selectedEmail.body}
                        </div>
                      )
                    ) : (
                      <div className="text-gray-500 italic">
                        No message content
                      </div>
                    )}
                  </div>

                  {/* Attachments in email style */}
                  {selectedEmail.attachments &&
                    selectedEmail.attachments.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {selectedEmail.attachments.length} attachment
                          {selectedEmail.attachments.length > 1 ? "s" : ""}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {selectedEmail.attachments.map(
                            (attachment, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                                onClick={() =>
                                  window.open(attachment.shareUrl, "_blank")
                                }
                              >
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {attachment.fileName}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatFileSize(attachment.fileSize)}
                                  </div>
                                </div>
                                <Download className="h-4 w-4 text-gray-400" />
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>

          {/* Dialog Footer */}
          <div className="flex justify-end gap-3 bg-background px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => setSelectedEmail(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
