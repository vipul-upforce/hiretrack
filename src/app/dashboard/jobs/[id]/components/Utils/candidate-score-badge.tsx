import { Badge } from "@/components/ui/badge";
import { scoreColors } from "@/lib/constants";

interface CandidateScoreBadgeProps {
  score: number; // Can be a float now
  category: string;
}

export function CandidateScoreBadge({
  score,
  category,
}: CandidateScoreBadgeProps) {
  const normalizedScore = Math.max(1, Math.min(10, score));
  const roundedScore = Math.round(normalizedScore);
  const { bg, text, border } = scoreColors[roundedScore] || scoreColors[1];
  const displayScore = score?.toFixed(1);

  return (
    <Badge
      variant="secondary"
      className={`text-xs border border-gray-200 dark:border-transparent font-medium px-2 py-1`}
      style={{
        backgroundColor: bg,
        color: text,
        borderColor: border,
      }}
    >
      <span className="text-[11px] mr-1 font-normal">{category}: </span>{" "}
      {displayScore}
    </Badge>
  );
}
