'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, TrendingUp } from 'lucide-react';
import React from 'react';

const DashboardCards = React.memo(
  ({
    assignmentsCounts,
  }: {
    assignmentsCounts: {
      [key: string]: number;
    };
  }) => (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {/* Total Interviews */}
      <Card className="relative overflow-hidden border-l-4 border-l-primary transition-shadow hover:shadow-md">
        <CardContent className="relative p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Total Interviews
              </p>
              <p className="text-2xl font-bold tracking-tight">
                {assignmentsCounts?.totalInterviews || 0}
              </p>
            </div>
            <div className="bg-primary/10 rounded-lg p-2">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* This Week */}
      <Card className="relative overflow-hidden border-l-4 border-l-blue-500 transition-shadow hover:shadow-md">
        <CardContent className="relative p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Interviews This Week
              </p>
              <p className="text-2xl font-bold tracking-tight">
                {assignmentsCounts?.thisweeksInterviews || 0}
              </p>
            </div>
            <div className="rounded-lg bg-blue-500/10 p-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today */}
      <Card className="relative overflow-hidden border-l-4 border-l-green-500 transition-shadow hover:shadow-md">
        <CardContent className="relative p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Interviews Today
              </p>
              <p className="text-2xl font-bold tracking-tight">
                {assignmentsCounts?.todaysInterviews || 0}
              </p>
            </div>
            <div className="rounded-lg bg-green-500/10 p-2">
              <Clock className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  ),
);

export default DashboardCards;
