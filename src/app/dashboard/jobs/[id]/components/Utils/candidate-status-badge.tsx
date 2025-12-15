import { Badge } from '@/components/ui/badge';
import { CandidateStatus } from '@/types/candidate';

const statusColors: Record<CandidateStatus, { bg: string; text: string }> = {
  applied: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
  },
  screening: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    text: 'text-yellow-700 dark:text-yellow-300',
  },
  shortlisted: {
    bg: 'bg-green-100 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-300',
  },
  processing: {
    bg: 'bg-purple-100 dark:bg-purple-900/20',
    text: 'text-purple-700 dark:text-purple-300',
  },
  accepted: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  rejected: {
    bg: 'bg-red-100 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
  },
  default: {
    bg: 'bg-gray-100 dark:bg-black',
    text: 'text-gray-700 dark:text-gray-300',
  },
};

interface CandidateStatusBadgeProps {
  status: CandidateStatus;
}

export function CandidateStatusBadge({ status }: CandidateStatusBadgeProps) {
  const { bg, text } = statusColors[status] || statusColors.default;

  return (
    <Badge variant="secondary" className={`${bg} ${text} border-0`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </Badge>
  );
}
