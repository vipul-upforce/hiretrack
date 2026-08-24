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
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {/* Total Interviews */}
      <Card className="relative overflow-hidden border-l-4 border-l-primary hover:shadow-md transition-shadow">
        <CardContent className="p-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Total Interviews
              </p>
              <p className="text-2xl font-bold tracking-tight">
                {assignmentsCounts?.totalInterviews || 0}
              </p>
            </div>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* This Week */}
      <Card className="relative overflow-hidden border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
        <CardContent className="p-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Interviews This Week
              </p>
              <p className="text-2xl font-bold tracking-tight">
                {assignmentsCounts?.thisweeksInterviews || 0}
              </p>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today */}
      <Card className="relative overflow-hidden border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
        <CardContent className="p-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Interviews Today
              </p>
              <p className="text-2xl font-bold tracking-tight">
                {assignmentsCounts?.todaysInterviews || 0}
              </p>
            </div>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Clock className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  ),
);

export default DashboardCards;
