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
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface EmailHistoryItem {
  _id: string;
  sentBy: {
    _id: string;
    name: string;
    email: string;
  };
  recipientId: {
    _id: string;
    name: string;
    email: string;
  };
  subject: string;
  body: string;
  cc: string[];
  bcc: string[];
  replyTo: string;
  attachments: Array<{
    fileName: string;
    fileSize: number;
    shareUrl: string;
  }>;
  status: "sent" | "failed" | "pending";
  provider: string;
  error?: string;
  sentAt?: string;
  createdAt: string;
}

export function EmailHistory() {
  const [emails, setEmails] = useState<EmailHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedEmail, setSelectedEmail] = useState<EmailHistoryItem | null>(
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
        limit: limit.toString(),
        ...(search && { search }),
        ...(statusFilter !== "all" && statusFilter && { status: statusFilter }),
      });

      const response = await fetch(`/api/email-history?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch email history");
      }

      const data = await response.json();
      setEmails(data.emails);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      toast.error("Failed to load email history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmailHistory();
  }, [page, search, statusFilter, limit]);

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
        <div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Sent By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails?.map((email) => (
                  <TableRow
                    key={email._id}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
                    onClick={() => setSelectedEmail(email)}
                  >
                    <TableCell className="whitespace-nowrap">
                      {format(
                        new Date(email.sentAt || email.createdAt),
                        "MMM d, yyyy HH:mm"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {email.recipientId.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {email.recipientId.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {email.subject}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{email.sentBy.name}</span>
                        <span className="text-xs text-gray-500">
                          {email.sentBy.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(email.status)}</TableCell>
                    <TableCell className="capitalize">
                      {email.provider}
                    </TableCell>
                    <TableCell>
                      {email.attachments.length > 0 && (
                        <Paperclip className="h-4 w-4 text-gray-400" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-500">Rows per page:</p>
                  <Select
                    value={limit.toString()}
                    onValueChange={(value) => {
                      setLimit(parseInt(value));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Email Details Dialog */}
      <Dialog
        open={!!selectedEmail}
        onOpenChange={() => setSelectedEmail(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedEmail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {selectedEmail.subject}
                </DialogTitle>
                <DialogDescription>
                  Sent on{" "}
                  {format(
                    new Date(selectedEmail.sentAt || selectedEmail.createdAt),
                    "MMMM d, yyyy 'at' HH:mm"
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-gray-600 mb-1">From:</p>
                    <p>
                      {selectedEmail.sentBy.name} ({selectedEmail.sentBy.email})
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-600 mb-1">To:</p>
                    <p>
                      {selectedEmail.recipientId.name} (
                      {selectedEmail.recipientId.email})
                    </p>
                  </div>
                  {selectedEmail.cc.length > 0 && (
                    <div>
                      <p className="font-semibold text-gray-600 mb-1">CC:</p>
                      <p>{selectedEmail.cc.join(", ")}</p>
                    </div>
                  )}
                  {selectedEmail.bcc.length > 0 && (
                    <div>
                      <p className="font-semibold text-gray-600 mb-1">BCC:</p>
                      <p>{selectedEmail.bcc.join(", ")}</p>
                    </div>
                  )}
                  {selectedEmail.replyTo && (
                    <div>
                      <p className="font-semibold text-gray-600 mb-1">
                        Reply To:
                      </p>
                      <p>{selectedEmail.replyTo}</p>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-600 mb-1">Status:</p>
                    <div className="mt-1">
                      {getStatusBadge(selectedEmail.status)}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-600 mb-1">
                      Provider:
                    </p>
                    <p className="capitalize">{selectedEmail.provider}</p>
                  </div>
                </div>

                {selectedEmail.error && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm text-red-800">
                      <strong>Error:</strong> {selectedEmail.error}
                    </p>
                  </div>
                )}

                <div>
                  <p className="font-semibold text-gray-600 mb-2">Message:</p>
                  <div className="bg-white dark:bg-black rounded p-4 whitespace-pre-wrap text-sm">
                    {selectedEmail.body}
                  </div>
                </div>

                {selectedEmail.attachments.length > 0 && (
                  <div>
                    <p className="font-semibold text-gray-600 mb-2">
                      Attachments:
                    </p>
                    <div className="space-y-2">
                      {selectedEmail.attachments.map((attachment, index) => (
                        <a
                          key={index}
                          href={attachment.shareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-900"
                        >
                          <Paperclip className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{attachment.fileName}</span>
                          <span className="text-xs text-gray-500">
                            ({formatFileSize(attachment.fileSize)})
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
