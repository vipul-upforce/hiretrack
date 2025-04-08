import { Badge } from "@/components/ui/badge";

// Define color mappings for scores 1-10
const scoreColors: Record<number, { bg: string; text: string }> = {
    1: { bg: "bg-red-200", text: "text-red-900" },
    2: { bg: "bg-red-100", text: "text-red-700" },
    3: { bg: "bg-red-100", text: "text-red-500" },
    4: { bg: "bg-orange-100", text: "text-orange-700" },
    5: { bg: "bg-amber-100", text: "text-amber-700" },
    6: { bg: "bg-lime-100", text: "text-lime-700" },
    7: { bg: "bg-teal-100", text: "text-teal-500" },
    8: { bg: "bg-teal-100", text: "text-teal-700" },
    9: { bg: "bg-emerald-100", text: "text-emerald-700" },
    10: { bg: "bg-green-100", text: "text-green-700" },
};

interface CandidateScoreBadgeProps {
    score: number; // Can be a float now
    category: string;
}

export function CandidateScoreBadge({ score, category }: CandidateScoreBadgeProps) {

    const normalizedScore = Math.max(1, Math.min(10, score));
    const roundedScore = Math.round(normalizedScore);
    const { bg, text } = scoreColors[roundedScore] || scoreColors[1];
    const displayScore = score?.toFixed(1);

    return (
        <Badge variant="secondary" className={`${bg} ${text} border-0`}>
            {category}: {displayScore}
        </Badge>
    );
}