import { Badge } from '@/components/ui/badge';
import { scoreColors } from '@/lib/constants';
import { useTheme } from '@/components/theme-provider';

interface CandidateScoreBadgeProps {
  score: number; // Can be a float now
  category: string;
}

export function CandidateScoreBadge({
  score,
  category,
}: CandidateScoreBadgeProps) {
  const { theme } = useTheme();
  const normalizedScore = Math.max(1, Math.min(10, score));
  const roundedScore = Math.round(normalizedScore);
  const colorData = scoreColors[roundedScore] || scoreColors[1];

  // Use dark mode colors if theme is dark
  const isDarkMode = theme === 'dark';
  const colors = isDarkMode ? colorData.dark : colorData;

  const displayScore = score?.toFixed(1);

  return (
    <Badge
      variant="secondary"
      className="text-xs font-medium px-2 py-1"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
        border: `1px solid ${colors.border}`,
      }}
    >
      <span className="text-[11px] mr-1 font-normal">
        {category}
        :
      </span>
      {' '}
      <span className="font-semibold">{displayScore}</span>
    </Badge>
  );
}
