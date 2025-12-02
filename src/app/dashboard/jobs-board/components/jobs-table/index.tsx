"use client";

import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import useCustomForm from "@/Custom_Fields/hooks/useCustomForm";
import ConfirmationDialog from "../../../jobs/[id]/components/Dialogs/ConfirmationDialog";
import { JobAnalyticsModal } from "./../JobAnalyticsModal";
import { User } from "@/lib/features/org/orgApi";
import { Job } from "@/types/job";
import { JobsTableProps, CustomFieldDef } from "./types";
import { ColumnsSelector } from "./columns-selector";
import { JobsTableHeader } from "./jobs-table-header";
import { JobsTableRow } from "./jobs-table-row";

export function JobsTableView(props: JobsTableProps) {
  const { jobs, setSelectedJob, setDuplicate } = props;

  const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {}
  );

  const { formNameObject } = useCustomForm("Job Position");

  // Local state for modals
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [selectedJobForDuplicate, setSelectedJobForDuplicate] =
    useState<Job | null>(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [selectedJobForAnalytics, setSelectedJobForAnalytics] =
    useState<Job | null>(null);

  // Get all available custom fields
  const availableCustomFields: CustomFieldDef[] = useMemo(() => {
    return (
      formNameObject?.fields
        .filter((field) => field.showOnCard && !field.jobId)
        .map((field) => ({
          label: field.label,
          showOnCard: field.showOnCard,
          jobId: field.jobId,
        })) || []
    );
  }, [formNameObject]);

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visibleColumns.size === 0) {
      const initialSet = new Set(["applications", "experience", "skills"]);
      availableCustomFields.slice(0, 2).forEach((f) => initialSet.add(f.label));
      setVisibleColumns(initialSet);
    }
  }, [availableCustomFields]);

  const handleDuplicateClick = (job: Job) => {
    setSelectedJobForDuplicate(job);
    setIsDuplicateDialogOpen(true);
  };

  const handleAnalyticsClick = (job: Job) => {
    setSelectedJobForAnalytics(job);
    setIsAnalyticsOpen(true);
  };

  const rowActions = {
    setSelectedJob,
    setIsDetailsOpen: props.setIsDetailsOpen,
    setIsEditMode: props.setIsEditMode,
    handleDeleteClick: props.handleDeleteClick,
    handleDuplicateClick,
    handleAnalyticsClick,
    onEmailSettingsClick: props.onEmailSettingsClick,
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Controls Bar (Column Selector) */}
      <div className="flex justify-end">
        <ColumnsSelector
          visibleColumns={visibleColumns}
          setVisibleColumns={setVisibleColumns}
          customFields={availableCustomFields}
        />
      </div>

      <div className="h-full  overflow-y-scroll my-1">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-black overflow-hidden">
          <Table>
            <JobsTableHeader
              sortField={props.sortField}
              sortDirection={props.sortDirection}
              onSort={props.onSort}
              visibleColumns={visibleColumns}
              customFields={availableCustomFields}
            />
            <TableBody>
              {jobs.length === 0 ? (
                <TableRow>
                  {/* Calculate colSpan dynamically based on visible columns + 4 mandatory */}
                  <TableCell
                    colSpan={4 + visibleColumns.size}
                    className="text-center h-32"
                  >
                    <p className="text-gray-500 dark:text-gray-400">
                      No jobs found
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <JobsTableRow
                    key={job._id}
                    job={job}
                    user={user}
                    visibleColumns={visibleColumns}
                    customFields={availableCustomFields}
                    actions={rowActions}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialogs */}
      {selectedJobForDuplicate && (
        <ConfirmationDialog
          title="Create Duplicate Job"
          message="Are you sure you want to create a duplicate of this job?"
          isOpen={isDuplicateDialogOpen}
          setIsOpen={setIsDuplicateDialogOpen}
          onConfirm={() => {
            setSelectedJob(selectedJobForDuplicate);
            setDuplicate(true);
            setSelectedJobForDuplicate(null);
          }}
          onCancel={() => {
            setIsDuplicateDialogOpen(false);
            setSelectedJobForDuplicate(null);
          }}
          className="sm:max-w-[300px]"
        />
      )}

      {selectedJobForAnalytics && user?.organizationId && (
        <JobAnalyticsModal
          isOpen={isAnalyticsOpen}
          onClose={() => {
            setIsAnalyticsOpen(false);
            setSelectedJobForAnalytics(null);
          }}
          job={selectedJobForAnalytics}
          organizationId={user.organizationId}
        />
      )}
    </div>
  );
}
