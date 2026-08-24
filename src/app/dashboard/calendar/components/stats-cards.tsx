'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  Calendar, TrendingUp, Users, Clock,
} from 'lucide-react';

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
      title: 'Total Interviews',
      value: totalInterviews,
      icon: Calendar,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
      borderColor: 'border-l-primary',
    },
    {
      title: 'Interviews This Week',
      value: thisWeekCount,
      icon: TrendingUp,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/10',
      borderColor: 'border-l-blue-500',
    },
    {
      title: 'Interviews Today',
      value: todayCount,
      icon: Clock,
      iconColor: 'text-green-500',
      iconBg: 'bg-green-500/10',
      borderColor: 'border-l-green-500',
    },
    {
      title: 'Upcoming Events',
      value: upcomingCount,
      icon: Users,
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-500/10',
      borderColor: 'border-l-purple-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card
          key={stat.title + stat.value}
          className={`relative overflow-hidden border-l-4 ${stat.borderColor} hover:shadow-md transition-shadow`}
        >
          <CardContent className="p-4 relative">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              </div>
              <div className={`p-2 ${stat.iconBg} rounded-lg`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
