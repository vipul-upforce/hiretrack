'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Mail,
  Search,
  Calendar,
  FileText,
  Paperclip,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import mongoose from 'mongoose';
import logger from '@/lib/logger';

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
  status: 'sent' | 'failed' | 'pending';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<EmailHistoryRecord | null>(
    null,
  );
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'sent' | 'failed' | 'pending'
  >('all');
  const fetchEmailHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/email-history');
      if (response.ok) {
        const data = await response.json();
        setEmails(data.emails || []);
      } else {
        logger.error('Failed to fetch email history');
      }
    } catch (error) {
      logger.error('Error fetching email history:', error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchEmailHistory();
  }, []);

  const filteredEmails = emails.filter((email) => {
    const matchesSearch =
      (email.recipientEmail || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (email.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (email.sentByName || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (email.sentByEmail || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (email.recipientName || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || email.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Mail className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      sent: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };

    return (
      <Badge
        variant="outline"
        className={cn('capitalize', variants[status as keyof typeof variants])}
      >
        {status}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Header section with improved design */}
      <div className="flex-shrink-0 border-b border-gray-200 px-4 pb-2 dark:border-gray-700">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="flex flex-col gap-y-2 px-0 py-3 md:flex-row md:items-center md:justify-between">
            {/* Title */}
            <div>
              <CardTitle className="line-clamp-2 text-xl font-bold md:mr-2">
                Email History
              </CardTitle>
            </div>

            {/* Right Section - Search and Filter */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by recipient, subject, or sender..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-96 max-w-lg pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  {['all', 'sent', 'failed', 'pending'].map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? 'default' : 'outline'}
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
      <div className="mt-4 flex-1 overflow-auto px-4 pb-4">
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
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="py-8 text-center">
                <Mail className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No emails found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No emails have been sent yet'}
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
                                'Unknown'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {email.recipientEmail || 'No email'}
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
                                  ', '}
                                {email.bcc &&
                                  email.bcc.length > 0 &&
                                  `BCC: ${email.bcc.length}`}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate font-medium">
                            {email.subject || 'No subject'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {email.sentByName ||
                                email.sentByEmail ||
                                'Unknown'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {email.sentByEmail || 'No email'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {format(
                                new Date(email.createdAt),
                                'MMM dd, yyyy',
                              )}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(email.createdAt), 'HH:mm')}
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
        <DialogContent className="!left-0 !top-0 flex !h-full !w-full min-w-0 !max-w-none !translate-x-0 !translate-y-0 flex-col overflow-hidden lg:!left-[50%] lg:!top-[50%] lg:!h-[85vh] lg:!min-w-[800px] lg:!max-w-[70vw] lg:!translate-x-[-50%] lg:!translate-y-[-50%] xl:!max-w-[60vw]">
          <DialogHeader className="border-b border-gray-200 px-6 pb-4 pr-12 pt-6 dark:border-gray-700">
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
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                      <h1 className="mb-2 text-xl font-medium text-gray-900 dark:text-gray-100">
                        {selectedEmail.subject || 'No subject'}
                      </h1>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        {selectedEmail.attachments &&
                          selectedEmail.attachments.length > 0 && (
                            <Paperclip className="h-4 w-4" />
                          )}
                        <span>
                          {format(
                            new Date(selectedEmail.createdAt),
                            'MMM dd, yyyy, h:mm a',
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 font-medium text-white">
                      {(
                        selectedEmail.sentByName ||
                        selectedEmail.sentByEmail ||
                        'U'
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {selectedEmail.sentByName || 'Unknown'}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          &lt;
                          {selectedEmail.sentByEmail}
                          &gt;
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span>
                          to{' '}
                          {selectedEmail.recipientName ||
                            selectedEmail.recipientEmail}
                        </span>
                        {((selectedEmail.cc && selectedEmail.cc.length > 0) ||
                          (selectedEmail.bcc &&
                            selectedEmail.bcc.length > 0)) && (
                          <span className="ml-2">
                            {selectedEmail.cc &&
                              selectedEmail.cc.length > 0 && (
                                <span>
                                  cc:
                                  {selectedEmail.cc.join(', ')}
                                </span>
                              )}
                            {selectedEmail.bcc &&
                              selectedEmail.bcc.length > 0 && (
                                <span className="ml-2">
                                  bcc: {selectedEmail.bcc.join(', ')}
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
                      selectedEmail.body.includes('<') &&
                      selectedEmail.body.includes('>') ? (
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
                      <div className="italic text-gray-500">
                        No message content
                      </div>
                    )}
                  </div>

                  {/* Attachments in email style */}
                  {selectedEmail.attachments &&
                    selectedEmail.attachments.length > 0 && (
                      <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
                        <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                          {selectedEmail.attachments.length} attachment
                          {selectedEmail.attachments.length > 1 ? 's' : ''}
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {selectedEmail.attachments.map(
                            (attachment, index) => (
                              <div
                                key={index}
                                className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                                onClick={() =>
                                  window.open(attachment.shareUrl, '_blank')
                                }
                              >
                                <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-100 dark:bg-blue-900">
                                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {attachment.fileName}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatFileSize(attachment.fileSize)}
                                  </div>
                                </div>
                                <Download className="h-4 w-4 text-gray-400" />
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>

          {/* Dialog Footer */}
          <div className="flex justify-end gap-3 border-t border-gray-200 bg-background px-6 py-4 dark:border-gray-700">
            <Button variant="outline" onClick={() => setSelectedEmail(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
