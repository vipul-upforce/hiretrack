"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
import { exportToCSV } from "../../utils/export";
import type { FunnelData, FunnelSummary } from "../CandidateFunnelChart";

interface ExportButtonProps {
  funnelData: FunnelData[];
  summary: FunnelSummary | null;
  filename?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  funnelData,
  summary,
  filename = "candidate_funnel_analysis",
}) => {
  const handleExport = () => {
    if (!funnelData || funnelData.length === 0) {
      console.warn("No funnel data to export");
      return;
    }

    const csvData = funnelData.map((item) => ({
      Stage: item.stage,
      Count: item.count,
      "Conversion Rate (%)": item.conversionRate.toFixed(2),
      "Average Time (Days)": item.avgTimeInDays.toFixed(1),
      "Previous Stage Count": item.previousStageCount,
    }));

    if (summary) {
      csvData.push(
        {
          Stage: "",
          Count: 0,
          "Conversion Rate (%)": "",
          "Average Time (Days)": "",
          "Previous Stage Count": 0,
        },
        {
          Stage: "SUMMARY",
          Count: 0,
          "Conversion Rate (%)": "",
          "Average Time (Days)": "",
          "Previous Stage Count": 0,
        },
        {
          Stage: "Total Candidates",
          Count: summary.totalCandidates,
          "Conversion Rate (%)": "",
          "Average Time (Days)": "",
          "Previous Stage Count": 0,
        },
        {
          Stage: "Accepted Candidates",
          Count: summary.acceptedCandidates,
          "Conversion Rate (%)": "",
          "Average Time (Days)": "",
          "Previous Stage Count": 0,
        },
        {
          Stage: "Rejected Candidates",
          Count: summary.rejectedCandidates,
          "Conversion Rate (%)": "",
          "Average Time (Days)": "",
          "Previous Stage Count": 0,
        },
        {
          Stage: "Overall Conversion Rate",
          Count: 0,
          "Conversion Rate (%)": `${summary.overallConversionRate}%`,
          "Average Time (Days)": "",
          "Previous Stage Count": 0,
        },
        {
          Stage: "Average Time to Hire",
          Count: 0,
          "Conversion Rate (%)": "",
          "Average Time (Days)": `${summary.avgTimeToHire} days`,
          "Previous Stage Count": 0,
        }
      );
    }

    exportToCSV(csvData, filename);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <DownloadIcon className="h-4 w-4 mr-2" />
      Export
    </Button>
  );
};

export default ExportButton;
