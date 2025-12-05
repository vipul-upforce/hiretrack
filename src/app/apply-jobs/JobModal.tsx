import { CreateCandidateDialog } from '../dashboard/jobs/[id]/components/Dialogs/create-candidate-dialog';
import CustomFieldsData from '@/Custom_Fields/Components/CustomFields/customFields-details';
import useRoles from '@/hooks/useRoles';
import { Dialog } from '@headlessui/react';
import { useState, useEffect } from 'react';
import ApplyOptions from './ApplyOptions';
import { hasAppliedAsGuest } from './ApplyAsGuest';
import '../../components/ui/rte/rteStyles.css';
import {
  Briefcase, X, ArrowRight, CheckCircle,
} from 'lucide-react';
import { useGetPortalConfigsQuery } from '@/lib/features/settings/settingsApi';

interface Job {
  title: string;
  description: string;
  skills: string[];
  experience: number;
  customFields?: Record<string, string>;
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

  const { data: portalData, isFetching: isPortalLoading } = useGetPortalConfigsQuery(undefined, { skip: !isOpen });

  // Apply portal colors when fetched
  useEffect(() => {
    if (portalData && !isPortalLoading) {
      if (portalData.primaryColor) setPrimaryColor(portalData.primaryColor);
      if (portalData.secondaryColor) setSecondaryColor(portalData.secondaryColor);
      if (portalData.secondaryColor) setSecondaryColor(portalData.secondaryColor);
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

  const hasSalary = !!salary
    && !salary.isPrivate
    && ((typeof salary.inText === 'string' && salary.inText.trim() !== '')
      || (typeof salary.min === 'number' && salary.min > 0));

  const handleContinue = () => {
    setIsPendingOptionsOpen(true);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose}>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          aria-hidden="true"
        />

        {/* Modal Container */}
        <div className="fixed inset-0 z-50 flex items-center justify-center lg:p-4">
          <Dialog.Panel className="w-full h-full lg:w-full lg:max-w-4xl lg:max-h-[90vh] lg:h-auto bg-white dark:bg-black border-0 lg:border border-gray-200 dark:border-gray-700 rounded-none lg:rounded-lg shadow-xl overflow-hidden flex flex-col">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-3 lg:p-6">
                <Dialog.Title
                  as="h3"
                  className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white flex-1 pr-3 lg:pr-4 line-clamp-2"
                  style={{
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
                  {job.title}
                </Dialog.Title>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="flex-shrink-0 p-1 lg:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 lg:w-6 lg:h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-3 lg:p-6 space-y-4 lg:space-y-6">
                {/* Description Section */}
                <div className="space-y-2 lg:space-y-3">
                  <h4 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">
                    Job Description
                  </h4>
                  <div className="bg-white dark:bg-black rounded-lg p-3 lg:p-4 border border-gray-200 dark:border-gray-700">
                    <div
                      id="description-marker"
                      className="text-gray-700 dark:text-gray-300 leading-relaxed prose prose-gray dark:prose-invert max-w-none"
                      style={{
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                      }}
                      dangerouslySetInnerHTML={{
                        __html: job?.description || 'No description available',
                      }}
                    />
                  </div>
                </div>

                {/* Skills Section */}
                <div className="space-y-2 lg:space-y-3">
                  <h4 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">
                    Required Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill: string, i: number) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 lg:px-3 py-1 text-xs lg:text-sm font-medium rounded-full border"
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
                  <h4 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">
                    Job Requirements
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                    {/* Experience */}
                    <div className="bg-white dark:bg-black rounded-lg p-3 lg:p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div
                          className="p-1.5 lg:p-2 rounded-lg"
                          style={{
                            backgroundColor: `${primaryColor}15`,
                          }}
                        >
                          <Briefcase
                            className="w-4 h-4 lg:w-5 lg:h-5"
                            style={{ color: primaryColor }}
                          />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Experience
                          </p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {job.experience}
                            {' '}
                            {job.experience === 1 ? 'year' : 'years'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Salary */}
                    {hasSalary && (
                      <div className="bg-white dark:bg-black rounded-lg p-3 lg:p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 lg:gap-3">
                          <div
                            className="p-1.5 lg:p-2 px-2 lg:px-3 rounded-lg flex items-center justify-center"
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
                              {(job as JobWithSalary).salary?.inText
                                || `${(job as JobWithSalary).salary?.min || 0} - ${(job as JobWithSalary).salary?.max || 0} LPA`}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom Fields Section */}
                {job?.customFields
                  && Object.keys(job.customFields).length > 0 && (
                    <div className="space-y-2 lg:space-y-3">
                      <h4 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">
                        Additional Information
                      </h4>
                      <div className="bg-white dark:bg-black rounded-lg p-3 lg:p-4 border border-gray-200 dark:border-gray-700">
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
                <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 sm:justify-end">
                  {/* Close button - hidden on mobile, visible on desktop */}
                  <button
                    type="button"
                    className="hidden lg:inline-flex items-center justify-center px-4 lg:px-6 py-2  text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 transition-colors"
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
                      onClick={handleContinue}
                      disabled={alreadyApplied || readOnly}
                      className={`flex items-center justify-center w-full sm:w-auto px-6 lg:px-8 py-2 lg:py-3 text-sm font-semibold rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                        alreadyApplied || readOnly
                          ? 'bg-gray-100 dark:bg-black text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed'
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
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Already Applied
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-5 h-5 mr-2" />
                          Apply Now
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="w-full sm:w-auto">
                      {alreadyApplied || readOnly ? (
                        <button
                          disabled
                          className="flex items-center justify-center w-full px-8 py-3 text-sm font-semibold rounded-lg bg-gray-100 dark:bg-black text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed"
                        >
                          <CheckCircle className="w-5 h-5 mr-2" />
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
