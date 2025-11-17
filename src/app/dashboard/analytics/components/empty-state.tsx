import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import React from "react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  message?: string;
}

const EmptyState = ({ title, description, message }: EmptyStateProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || "Analytics Data"}</CardTitle>
        <CardDescription>{description || "No data available"}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center justify-center text-foreground/70">
          {message || "No analytics data available for the selected filters."}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmptyState;
