import { Badge } from "@/components/ui/badge";
import { CandidateStatus } from "@/types/candidate";

const statusColors: Record<CandidateStatus, { bg: string; text: string }> = {
  applied: { bg: 'bg-blue-100', text: 'text-blue-700' },
  screening: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  shortlisted: { bg: 'bg-green-100', text: 'text-green-700' },
  processing: { bg: 'bg-purple-100', text: 'text-purple-700' },
  accepted: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700' },
  default: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

interface CandidateStatusBadgeProps {
  status: CandidateStatus;
}

export function CandidateStatusBadge({ status }: CandidateStatusBadgeProps) {
  const { bg, text } = statusColors[status] || statusColors.default;
  
  return (
    <Badge 
      variant="secondary" 
      className={`${bg} ${text} border-0`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
} 