import { Badge } from "@/components/ui/badge";

// Define color mappings for scores 1-10
const scoreColors: Record<number, { bg: string; text: string }> = {
  1: {
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-800 dark:text-red-300",
  },
  2: {
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-700 dark:text-red-300",
  },
  3: {
    bg: "bg-orange-50 dark:bg-red-900/20",
    text: "text-orange-700 dark:text-red-400",
  },
  4: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    text: "text-orange-700 dark:text-orange-300",
  },
  5: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-300",
  },
  6: {
    bg: "bg-yellow-50 dark:bg-lime-900/20",
    text: "text-yellow-700 dark:text-lime-300",
  },
  7: {
    bg: "bg-lime-50 dark:bg-teal-900/20",
    text: "text-lime-700 dark:text-teal-400",
  },
  8: {
    bg: "bg-emerald-50 dark:bg-teal-900/20",
    text: "text-emerald-700 dark:text-teal-300",
  },
  9: {
    bg: "bg-green-50 dark:bg-emerald-900/20",
    text: "text-green-700 dark:text-emerald-300",
  },
  10: {
    bg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-300",
  },
};

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
  const { bg, text } = scoreColors[roundedScore] || scoreColors[1];
  const displayScore = score?.toFixed(1);

  return (
    <Badge
      variant="secondary"
      className={`${bg} ${text} text-xs border border-gray-200 dark:border-transparent font-medium px-2 py-1`}
    >
      <span className="text-[11px] mr-1 font-normal">{category}: </span>{" "}
      {displayScore}
    </Badge>
  );
}
