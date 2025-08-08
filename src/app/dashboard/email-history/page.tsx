"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail,
  Search,
  Calendar,
  User,
  FileText,
  Paperclip,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Filter,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import mongoose from "mongoose";

export interface EmailHistoryRecord {
  _id: string;
  sentBy: mongoose.Types.ObjectId;
  sentByEmail: string;
  sentByName: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  cc: string[];
  bcc: string[];
  replyTo?: string;
  attachments: Array<{
    fileName: string;
    shareUrl: string;
    fileSize: number;
    shareId: string;
  }>;
  status: "sent" | "failed" | "pending";
  provider: string;
  error?: string;
  metadata?: {
    jobId?: string;
    candidateId?: string;
    templateUsed?: string;
  };
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function EmailHistoryPage() {
  const [emails, setEmails] = useState<EmailHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<EmailHistoryRecord | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | "sent" | "failed" | "pending"
  >("all");

  useEffect(() => {
    fetchEmailHistory();
  }, []);

  const fetchEmailHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/email-history");
      if (response.ok) {
        const data = await response.json();
        setEmails(data.emails || []);
      } else {
        console.error("Failed to fetch email history");
      }
    } catch (error) {
      console.error("Error fetching email history:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmails = emails.filter((email) => {
    const matchesSearch =
      (email.recipientEmail || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (email.subject || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (email.sentByName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (email.sentByEmail || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (email.recipientName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || email.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
    const variants = {
      sent: "bg-green-100 text-green-800 border-green-200",
      failed: "bg-red-100 text-red-800 border-red-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    };

    return (
      <Badge
        variant="outline"
        className={cn("capitalize", variants[status as keyof typeof variants])}
      >
        {status}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden w-full">
      {/* Header section with improved design */}
      <div className="flex-shrink-0 px-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-y-2 py-3 px-0">
            {/* Title */}
            <div>
              <CardTitle className="line-clamp-2 md:mr-2 text-xl font-bold">
                Email History
              </CardTitle>
            </div>

            {/* Right Section - Search and Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by recipient, subject, or sender..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 max-w-lg w-96"
                  />
                </div>
                <div className="flex gap-2">
                  {["all", "sent", "failed", "pending"].map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter(status as any)}
                      className="capitalize"
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto px-4 pb-4 mt-4">
        {/* Email List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email History ({filteredEmails.length})
            </CardTitle>
            <CardDescription>
              Complete audit trail of all emails sent through the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">No emails found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "No emails have been sent yet"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                    {filteredEmails.map((email) => (
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
                              {email.sentByName ||
                                email.sentByEmail ||
                                "Unknown"}
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
                              {format(
                                new Date(email.createdAt),
                                "MMM dd, yyyy"
                              )}
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
              <div className="bg-white dark:bg-gray-900">
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
                                className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
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
