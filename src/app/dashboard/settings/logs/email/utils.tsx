import { Badge } from '@/components/ui/badge';
import {
  AlertCircle, CheckCircle, Clock, Mail,
} from 'lucide-react';

export const getStatusIcon = (status: string) => {
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

export const getStatusBadge = (status: string) => {
  switch (status) {
    case 'sent':
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Sent
        </Badge>
      );
    case 'failed':
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200">
          <XCircleIcon />
          Failed
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    default:
      return null;
  }
};

function XCircleIcon() {
  return <AlertCircle className="h-3 w-3 mr-1" />;
}

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
