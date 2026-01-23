import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { scoreColors } from '@/lib/constants';
import { useTheme } from '@/components/theme-provider';

interface CircularScoreProps {
  score: number | null | undefined;
  category: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  treatZeroAsEmpty?: boolean;
}

export function CircularScore({
  score,
  category,
  size = 'sm',
  showLabel = false,
  treatZeroAsEmpty = false,
}: CircularScoreProps) {
  const hasScore =
    score !== null &&
    score !== undefined &&
    !Number.isNaN(score) &&
    !(treatZeroAsEmpty && score === 0);
  const normalizedScore = hasScore ? Math.max(0, Math.min(10, score)) : 0;
  const percentage = hasScore ? (normalizedScore / 10) * 100 : 0;

  let displayScore: string;
  if (!hasScore) {
    displayScore = '-';
  } else if (score % 1 === 0) {
    displayScore = score.toString();
  } else {
    displayScore = score.toFixed(1);
  }

  // Size configurations
  const sizeConfig = {
    xs: {
      container: 'w-12 h-12',
      svg: 'w-12 h-12',
      strokeWidth: 6,
      radius: 46,
      fontSize: 'text-sm',
      labelSize: 'text-xs',
    },
    sm: {
      container: 'w-20 h-20',
      svg: 'w-20 h-20',
      strokeWidth: 6,
      radius: 30,
      fontSize: 'text-base',
      labelSize: 'text-xs',
    },
    md: {
      container: 'w-16 h-16',
      svg: 'w-16 h-16',
      strokeWidth: 4,
      radius: 24,
      fontSize: 'text-sm',
      labelSize: 'text-xs',
    },
    lg: {
      container: 'w-20 h-20',
      svg: 'w-20 h-20',
      strokeWidth: 5,
      radius: 30,
      fontSize: 'text-base',
      labelSize: 'text-sm',
    },
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color based on score
  const getScoreColor = (scoreValue: number, hasScoreValue: boolean) => {
    if (!hasScoreValue) return 'stroke-gray-300 dark:stroke-gray-600';
    if (scoreValue >= 8) return 'stroke-emerald-500';
    if (scoreValue >= 7) return 'stroke-teal-500';
    if (scoreValue >= 6) return 'stroke-blue-500';
    if (scoreValue >= 5) return 'stroke-amber-500';
    if (scoreValue >= 3) return 'stroke-orange-500';
    return 'stroke-red-500';
  };

  const getBackgroundColor = (scoreValue: number, hasScoreValue: boolean) => {
    if (!hasScoreValue) return 'stroke-gray-100 dark:stroke-gray-800';
    if (scoreValue >= 8) return 'stroke-emerald-100 dark:stroke-emerald-900';
    if (scoreValue >= 7) return 'stroke-teal-100 dark:stroke-teal-900';
    if (scoreValue >= 6) return 'stroke-blue-100 dark:stroke-blue-900';
    if (scoreValue >= 5) return 'stroke-amber-100 dark:stroke-amber-900';
    if (scoreValue >= 3) return 'stroke-orange-100 dark:stroke-orange-900';
    return 'stroke-red-100 dark:stroke-red-900';
  };

  const scoreColor = getScoreColor(normalizedScore, hasScore);
  const bgColor = getBackgroundColor(normalizedScore, hasScore);

  const circleElement = (
    <div className={cn('relative', config.container)}>
      <svg viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={config.radius}
          fill="none"
          className={cn(bgColor)}
          strokeWidth={config.strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={config.radius}
          fill="none"
          className={cn(scoreColor, 'transition-all duration-500 ease-out')}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition:
              'stroke-dashoffset 0.5s ease-in-out, filter 0.3s ease-out',
            filter: 'drop-shadow(0 0 0px transparent)',
          }}
        />
      </svg>
      {/* Score text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            'font-bold text-foreground transition-all duration-300 ease-out',
            config.fontSize,
          )}
        >
          {displayScore}
        </span>
      </div>
      {/* Pulse animation ring */}
    </div>
  );

  return (
    <div className="group flex flex-1 cursor-pointer flex-col items-center justify-center">
      {circleElement}
      {showLabel && (
        <span
          className={cn(
            'mt-1 text-center font-bold text-muted-foreground',
            config.labelSize,
          )}
        >
          {category}
        </span>
      )}
    </div>
  );
}

// Compact score badge component for search results
function CompactScoreBadge({
  score,
  category,
}: {
  score: number;
  category: string;
}) {
  const { theme } = useTheme();
  const normalizedScore = Math.max(1, Math.min(10, score));
  const roundedScore = Math.round(normalizedScore);
  const colorData = scoreColors[roundedScore] || scoreColors[1];

  // Use dark mode colors if theme is dark
  const isDarkMode = theme === 'dark';
  const colors = isDarkMode ? colorData.dark : colorData;

  const displayScore = score % 1 === 0 ? score.toString() : score.toFixed(1);

  return (
    <Badge
      variant="secondary"
      className="px-2 py-1 text-xs font-medium"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
        border: `1px solid ${colors.border}`,
      }}
    >
      <span className="mr-1 text-[11px] font-normal">{category}:</span>
      <span className="font-semibold">{displayScore}</span>
    </Badge>
  );
}

// Badge version for search results - using original badge format
export function CompactCircularScores({
  scores,
}: {
  scores: {
    overall?: number;
    experience?: number;
    skills?: number;
    affordability?: number;
  };
}) {
  if (!scores || Object.keys(scores).length === 0 || !scores.overall || scores.overall === null || scores.experience === undefined || scores.experience === null || scores.skills === undefined || scores.skills === null || scores.affordability === undefined || scores.affordability === null) {
    return (
      <Badge
        variant="outline"
        className="border-muted-foreground/30 bg-muted/30 text-xs text-muted-foreground"
      >
        Not Evaluated
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {scores.overall !== undefined && (
        <CompactScoreBadge score={scores.overall} category="Overall" />
      )}
      {scores.experience !== undefined && (
        <CompactScoreBadge score={scores.experience} category="Exp" />
      )}
      {scores.skills !== undefined && (
        <CompactScoreBadge score={scores.skills} category="Skills" />
      )}
      {scores.affordability !== undefined && (
        <CompactScoreBadge score={scores.affordability} category="Afford" />
      )}
    </div>
  );
}

// Single line version for candidate cards with labels - always shows all 4 sections
export function GridCircularScores({
  scores,
}: {
  scores: {
    overall?: number;
    experience?: number;
    skills?: number;
    affordability?: number;
  };
}) {
  const scoreData = scores || {};

  return (
    <div className="mb-3 flex w-full items-center justify-between">
      <CircularScore
        score={scoreData.overall}
        category="Overall"
        size="xs"
        showLabel
      />
      <CircularScore
        score={scoreData.experience}
        category="Experience"
        size="xs"
        showLabel
      />
      <CircularScore
        score={scoreData.skills}
        category="Skills"
        size="xs"
        showLabel
      />
      <CircularScore
        score={scoreData.affordability}
        category="Affordability"
        size="xs"
        showLabel
      />
    </div>
  );
}
