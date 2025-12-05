import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Mail,
  Paperclip,
} from 'lucide-react';
import { format } from 'date-fns';
import { EmailHistoryRecord } from '../types';
import { getStatusBadge, getStatusIcon } from '../utils';

interface EmailHistoryTableProps {
  emails: EmailHistoryRecord[];
  loading: boolean;
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  onViewEmail: (email: EmailHistoryRecord) => void;
}

export function EmailHistoryTable({
  emails,
  loading,
  page,
  totalPages,
  setPage,
  onViewEmail,
}: EmailHistoryTableProps) {
  if (!loading && emails.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>No emails found</p>
      </div>
    );
  }

  return (
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
                    {email.recipientName || email.recipientEmail || 'Unknown'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {email.recipientEmail || 'No email'}
                  </span>
                  {((email.cc && email.cc.length > 0)
                    || (email.bcc && email.bcc.length > 0)) && (
                    <span className="text-xs text-muted-foreground">
                      {email.cc
                        && email.cc.length > 0
                        && `CC: ${email.cc.length}`}
                      {email.cc
                        && email.cc.length > 0
                        && email.bcc
                        && email.bcc.length > 0
                        && ', '}
                      {email.bcc
                        && email.bcc.length > 0
                        && `BCC: ${email.bcc.length}`}
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
                    {email.sentByName || email.sentByEmail || 'Unknown'}
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
                    {format(new Date(email.createdAt), 'MMM dd, yyyy')}
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
                    <span className="text-sm">{email.attachments.length}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewEmail(email)}
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
          Page
          {' '}
          {page}
          {' '}
          of
          {' '}
          {totalPages}
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
  );
}
