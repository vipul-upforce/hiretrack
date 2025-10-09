"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Calendar, TrendingUp, Users, Clock } from "lucide-react";

interface StatsCardsProps {
  todayCount: number;
  thisWeekCount: number;
  totalInterviews: number;
  upcomingCount: number;
}

export function StatsCards({
  todayCount,
  thisWeekCount,
  totalInterviews,
  upcomingCount,
}: StatsCardsProps) {
  const stats = [
    {
      title: "Today's Events",
      value: todayCount,
      icon: Calendar,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "This Week",
      value: thisWeekCount,
      icon: TrendingUp,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/30",
    },
    {
      title: "Interviews",
      value: totalInterviews,
      icon: Users,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      title: "Upcoming",
      value: upcomingCount,
      icon: Clock,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className="border-border/50 hover:border-border transition-colors"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
