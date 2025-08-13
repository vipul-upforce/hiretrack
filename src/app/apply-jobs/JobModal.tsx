import { CreateCandidateDialog } from "../dashboard/jobs/[id]/components/Dialogs/create-candidate-dialog";
import CustomFieldsData from "@/Custom_Fields/Components/CustomFields/customFields-details";
import useRoles from "@/hooks/useRoles";
import { Dialog } from "@headlessui/react";
import { useState, useEffect } from "react";
import ApplyOptions from "./ApplyOptions";
import { hasAppliedAsGuest } from "./ApplyAsGuest";
import "../../components/ui/rte/rteStyles.css";
import {
  Briefcase,
  Clock,
  X,
  ArrowRight,
  CheckCircle,
  Plus,
} from "lucide-react";

// Define a type for the job object
interface Job {
  title: string;
  description: string;
  skills: string[];
  experience: number;
  customFields?: {
    [index: string]: string;
  };
  _id?: string;
}

interface JobModalProps {
  job: Job | null; // Allow job to be null
  isOpen: boolean;
  onClose: () => void;
  orgName: string;
  readOnly: boolean;
}

// Add salary interface to job
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
  const [primaryColor, setPrimaryColor] = useState<string>("#6366f1");
  const [secondaryColor, setSecondaryColor] = useState<string>("#8b5cf6");

  const roles = useRoles();

  // Fetch portal colors
  useEffect(() => {
    const fetchPortalColors = async () => {
      try {
        const response = await fetch("/api/settings/portal");
        if (response.ok) {
          const data = await response.json();
          if (data.primaryColor) {
            setPrimaryColor(data.primaryColor);
          }
          if (data.secondaryColor) {
            setSecondaryColor(data.secondaryColor);
          }
        }
      } catch (error) {
        console.error("Failed to fetch portal colors:", error);
      }
    };

    if (isOpen) {
      fetchPortalColors();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isPendingOptionsOpen && !isOpen) {
      setIsModalOpen(true);
      setIsPendingOptionsOpen(false);
    }
  }, [isOpen, isPendingOptionsOpen]);

  useEffect(() => {
    const checkApplicationStatus = () => {
      if (job && job._id) {
        const applied = hasAppliedAsGuest(job._id);
        setAlreadyApplied(applied);
      }
    };

    checkApplicationStatus();
  }, [job]);

  if (!job) return null;

  const handleContinue = () => {
    setIsPendingOptionsOpen(true);
    onClose();
  };
  // console.log(/"JobModal job:", job);

  return (
    <>
      <Dialog open={isOpen} onClose={onClose}>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          aria-hidden="true"
        />

        {/* Modal Container */}
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
          <Dialog.Panel className="w-full h-full sm:w-full sm:max-w-4xl sm:max-h-[90vh] sm:h-auto bg-white dark:bg-gray-900 border-0 sm:border border-gray-200 dark:border-gray-700 rounded-none sm:rounded-lg shadow-xl overflow-hidden flex flex-col">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-4 sm:p-6">
                <Dialog.Title
                  as="h3"
                  className="text-2xl font-bold text-gray-900 dark:text-white flex-1 pr-4 line-clamp-2"
                  style={{
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                  }}
                >
                  {job.title}
                </Dialog.Title>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="flex-shrink-0 p-2 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-4 sm:p-6 space-y-6">
                {/* Description Section */}
                <div className="space-y-3">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Job Description
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div
                      id="description-marker"
                      className="text-gray-700 dark:text-gray-300 leading-relaxed prose prose-gray dark:prose-invert max-w-none"
                      style={{
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                      }}
                      dangerouslySetInnerHTML={{
                        __html: job?.description || "No description available",
                      }}
                    />
                  </div>
                </div>

                {/* Skills Section */}
                <div className="space-y-3">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Required Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill: string, i: number) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full border"
                        style={{
                          backgroundColor: `${primaryColor}10`,
                          color: primaryColor,
                          borderColor: `${primaryColor}30`,
                          wordBreak: "break-word",
                          overflowWrap: "break-word",
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* {job?.links?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Job Links
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      {job.links.map((link, index) => (
                        <a
                          key={index}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline break-all block"
                          style={{
                            wordBreak: "break-word",
                            overflowWrap: "break-word",
                          }}
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                )} */}
                {/* Experience & Salary Section */}
                <div className="space-y-3">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Job Requirements
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Experience */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{
                            backgroundColor: `${primaryColor}15`,
                          }}
                        >
                          <Briefcase
                            className="w-5 h-5"
                            style={{ color: primaryColor }}
                          />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Experience
                          </p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {job.experience}{" "}
                            {job.experience === 1 ? "year" : "years"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Salary */}
                    {(job as JobWithSalary)?.salary && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div
                            className="p-2 rounded-lg flex items-center justify-center"
                            style={{
                              backgroundColor: `${secondaryColor}15`,
                            }}
                          >
                            <span
                              className="text-lg font-bold"
                              style={{ color: secondaryColor }}
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
                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Additional Information
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
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
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4 sm:justify-end">
                  {/* Close button - hidden on mobile, visible on desktop */}
                  <button
                    type="button"
                    className="hidden sm:inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 transition-colors"
                    onFocus={(e) => {
                      e.target.style.boxShadow = `0 0 0 2px ${primaryColor}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = "none";
                    }}
                    onClick={onClose}
                  >
                    Close
                  </button>

                  {/* Apply button */}
                  {roles === "" ? (
                    <button
                      onClick={handleContinue}
                      disabled={alreadyApplied || readOnly}
                      className={`flex items-center justify-center w-full sm:w-auto px-8 py-3 text-sm font-semibold rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                        alreadyApplied || readOnly
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed"
                          : "text-white"
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
                          className="flex items-center justify-center w-full px-8 py-3 text-sm font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed"
                        >
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Already Applied
                        </button>
                      ) : (
                        <div className="w-full">
                          <CreateCandidateDialog
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
