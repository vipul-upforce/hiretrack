import CustomFieldsData from '@/Custom_Fields/Components/CustomFields/customFields-details';
import { CustomFieldValues } from '@/Custom_Fields/hooks/useCustomForm';
import useRoles from '@/hooks/useRoles';
import { Dialog } from '@headlessui/react';
import React, { useState, useEffect } from 'react';
import '../../components/ui/rte/rteStyles.css';
import { Briefcase, X, ArrowRight, CheckCircle } from 'lucide-react';
import { useGetPortalConfigsQuery } from '@/lib/features/settings';
import ApplyOptions from './ApplyOptions';
import { CreateCandidateDialog } from '../dashboard/jobs/[id]/components/Dialogs/create-candidate-dialog';
import { hasAppliedAsGuest } from './utils/guestApplicationUtils';

interface Job {
  title: string;
  description: string;
  skills: string[];
  experience: number;
  customFields?: CustomFieldValues;
  _id?: string;
}

interface JobModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  orgName: string;
  readOnly: boolean;
}

interface JobWithSalary extends Job {
  salary?: {
    min: number;
    max: number;
    inText: string;
    isPrivate: boolean;
  };
}
/* eslint-disable max-lines */

export default function JobModal({
  job,
  isOpen,
  onClose,
  orgName,
  readOnly,
}: JobModalProps) {
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isPendingOptionsOpen, setIsPendingOptionsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [secondaryColor, setSecondaryColor] = useState('#8b5cf6');

  const roles = useRoles();

  const { data: portalData, isFetching: isPortalLoading } =
    useGetPortalConfigsQuery(undefined, { skip: !isOpen });

  // Apply portal colors when fetched
  useEffect(() => {
    if (portalData && !isPortalLoading) {
      if (portalData.primaryColor) setPrimaryColor(portalData.primaryColor);
      if (portalData.secondaryColor)
        setSecondaryColor(portalData.secondaryColor);
      if (portalData.secondaryColor)
        setSecondaryColor(portalData.secondaryColor);
    }
  }, [portalData]);

  // Handle modal transition between ApplyOptions and JobModal
  useEffect(() => {
    if (isPendingOptionsOpen && !isOpen) {
      setIsModalOpen(true);
      setIsPendingOptionsOpen(false);
    }
  }, [isOpen, isPendingOptionsOpen]);

  // Check if user already applied (as guest)
  useEffect(() => {
    if (job?._id) {
      const applied = hasAppliedAsGuest(job._id);
      setAlreadyApplied(applied);
    }
  }, [job, onClose]);

  if (!job) return null;

  const salary = (job as JobWithSalary)?.salary;

  const hasSalary =
    !!salary &&
    !salary.isPrivate &&
    ((typeof salary.inText === 'string' && salary.inText.trim() !== '') ||
      (typeof salary.min === 'number' && salary.min > 0));

  const handleContinue = () => {
    setIsPendingOptionsOpen(true);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose}>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          aria-hidden="true"
        />

        {/* Modal Container */}
        <div className="fixed inset-0 z-50 flex items-center justify-center lg:p-4">
          <Dialog.Panel className="flex h-full w-full flex-col overflow-hidden rounded-none border-0 border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-black lg:h-auto lg:max-h-[90vh] lg:w-full lg:max-w-4xl lg:rounded-lg lg:border">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-3 lg:p-6">
                <Dialog.Title
                  as="h3"
                  className="line-clamp-2 flex-1 pr-3 text-xl font-bold text-gray-900 dark:text-white lg:pr-4 lg:text-2xl"
                  style={{
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
                  {job.title}
                </Dialog.Title>

                {/* Close button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-shrink-0 rounded-full p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 lg:p-2"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-400 lg:h-6 lg:w-6" />
                </button>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-4 p-3 lg:space-y-6 lg:p-6">
                {/* Description Section */}
                <div className="space-y-2 lg:space-y-3">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white lg:text-lg">
                    Job Description
                  </h4>
                  <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-black lg:p-4">
                    <div
                      id="description-marker"
                      className="prose prose-gray dark:prose-invert max-w-none leading-relaxed text-gray-700 dark:text-gray-300"
                      style={{
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                      }}
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{
                        __html: job?.description || 'No description available',
                      }}
                    />
                  </div>
                </div>

                {/* Skills Section */}
                <div className="space-y-2 lg:space-y-3">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white lg:text-lg">
                    Required Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill: string) => (
                      <span
                        key={skill}
                        className="inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium lg:px-3 lg:text-sm"
                        style={{
                          backgroundColor: `${primaryColor}10`,
                          color: primaryColor,
                          borderColor: `${primaryColor}30`,
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Experience & Salary Section */}
                <div className="space-y-2 lg:space-y-3">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white lg:text-lg">
                    Job Requirements
                  </h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:gap-4">
                    {/* Experience */}
                    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-black lg:p-4">
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div
                          className="rounded-lg p-1.5 lg:p-2"
                          style={{
                            backgroundColor: `${primaryColor}15`,
                          }}
                        >
                          <Briefcase
                            className="h-4 w-4 lg:h-5 lg:w-5"
                            style={{ color: primaryColor }}
                          />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Experience
                          </p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {job.experience}{' '}
                            {job.experience === 1 ? 'year' : 'years'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Salary */}
                    {hasSalary && (
                      <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-black lg:p-4">
                        <div className="flex items-center gap-2 lg:gap-3">
                          <div
                            className="flex items-center justify-center rounded-lg p-1.5 px-2 lg:p-2 lg:px-3"
                            style={{
                              backgroundColor: `${primaryColor}15`,
                            }}
                          >
                            <span
                              className="text-lg font-bold"
                              style={{ color: primaryColor }}
                            >
                              ₹
                            </span>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Salary
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {(job as JobWithSalary).salary?.inText ||
                                `${(job as JobWithSalary).salary?.min || 0} - ${(job as JobWithSalary).salary?.max || 0} LPA`}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom Fields Section */}
                {job?.customFields &&
                  Object.keys(job.customFields).length > 0 && (
                    <div className="space-y-2 lg:space-y-3">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white lg:text-lg">
                        Additional Information
                      </h4>
                      <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-black lg:p-4">
                        <CustomFieldsData
                          customFields={job?.customFields || {}}
                        />
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
              <div className="p-3 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end lg:gap-4">
                  {/* Close button - hidden on mobile, visible on desktop */}
                  <button
                    type="button"
                    className="hidden items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 dark:border-gray-700 dark:bg-black dark:text-gray-300 dark:hover:bg-gray-700 lg:inline-flex lg:px-6"
                    onFocus={(e) => {
                      e.target.style.boxShadow = `0 0 0 2px ${primaryColor}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = 'none';
                    }}
                    onClick={onClose}
                  >
                    Close
                  </button>

                  {/* Apply button */}
                  {roles === '' ? (
                    <button
                      type="button"
                      onClick={handleContinue}
                      disabled={alreadyApplied || readOnly}
                      className={`flex w-full items-center justify-center rounded-lg px-6 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 sm:w-auto lg:px-8 lg:py-3 ${
                        alreadyApplied || readOnly
                          ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-500 dark:border-gray-700 dark:bg-black dark:text-gray-400'
                          : 'text-white'
                      }`}
                      style={
                        alreadyApplied || readOnly
                          ? {}
                          : ({
                              backgroundColor: primaryColor,
                            } as React.CSSProperties)
                      }
                      onMouseEnter={(e) => {
                        if (!alreadyApplied && !readOnly) {
                          const target = e.target as HTMLElement;
                          target.style.backgroundColor = secondaryColor;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!alreadyApplied && !readOnly) {
                          const target = e.target as HTMLElement;
                          target.style.backgroundColor = primaryColor;
                        }
                      }}
                    >
                      {alreadyApplied ? (
                        <>
                          <CheckCircle className="mr-2 h-5 w-5" />
                          Already Applied
                        </>
                      ) : (
                        <>
                          <ArrowRight className="mr-2 h-5 w-5" />
                          Apply Now
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="w-full sm:w-auto">
                      {alreadyApplied || readOnly ? (
                        <button
                          type="button"
                          disabled
                          className="flex w-full cursor-not-allowed items-center justify-center rounded-lg border border-gray-200 bg-gray-100 px-8 py-3 text-sm font-semibold text-gray-500 dark:border-gray-700 dark:bg-black dark:text-gray-400"
                        >
                          <CheckCircle className="mr-2 h-5 w-5" />
                          Already Applied
                        </button>
                      ) : (
                        <div className="w-full">
                          <CreateCandidateDialog
                            primaryColor={primaryColor}
                            secondaryColor={secondaryColor}
                            jobId={job._id as string}
                            isOpen={isFormDialogOpen}
                            setIsOpen={setIsFormDialogOpen}
                            jobTitle={job.title}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Render the ApplyOptions dialog outside the parent dialog */}
      <ApplyOptions
        job={job}
        isOptionsOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orgName={orgName}
        readOnly={alreadyApplied || readOnly}
      />
    </>
  );
}
