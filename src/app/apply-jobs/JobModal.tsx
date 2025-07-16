import { CreateCandidateDialog } from "../dashboard/jobs/[id]/components/Dialogs/create-candidate-dialog";
import CustomFieldsData from "@/Custom_Fields/Components/CustomFields/customFields-details";
import useRoles from "@/hooks/useRoles";
import { Dialog } from "@headlessui/react";
import { useState, useEffect } from "react";
import ApplyOptions from "./ApplyOptions";
import { hasAppliedAsGuest } from "./ApplyAsGuest";
import "../../components/ui/rte/rteStyles.css";

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

  const roles = useRoles();

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

  return (
    <>
      <Dialog open={isOpen} onClose={onClose}>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          aria-hidden="true"
        />

        {/* Modal Container */}
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <Dialog.Panel
            className="
            w-full h-full
            sm:w-[calc(100%-2rem)] sm:h-[calc(100%-2rem)] sm:max-w-2xl
            md:w-[calc(100%-3rem)] md:h-[calc(100%-3rem)] md:max-w-3xl
            lg:w-[calc(100%-4rem)] lg:h-[calc(100%-4rem)] lg:max-w-4xl
            xl:max-w-5xl
            bg-white 
            flex flex-col
            rounded-none sm:rounded-lg md:rounded-xl lg:rounded-2xl 
            shadow-xl
            overflow-hidden
          "
          >
            {/* Header - Fixed */}
            <div className="flex-shrink-0 bg-white border-b border-gray-100">
              <div className="flex items-center justify-between p-4 sm:p-5 lg:p-6">
                <Dialog.Title
                  as="h3"
                  className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 flex-1 pr-4 line-clamp-2"
                  style={{
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                  }}
                >
                  {job.title}
                </Dialog.Title>

                {/* Close button - visible on mobile */}
                <button
                  onClick={onClose}
                  className="flex-shrink-0 p-2 rounded-full hover:bg-gray-100 transition-colors sm:hidden"
                  aria-label="Close modal"
                >
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-4 sm:p-5 lg:p-6 space-y-5 sm:space-y-6">
                {/* Description */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm sm:text-base text-gray-900">
                    Job Description
                  </h4>
                  <div
                    id="description-marker"
                    className="text-sm sm:text-base text-gray-700  leading-relaxed prose prose-sm sm:prose max-w-none"
                    style={{
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                    }}
                    dangerouslySetInnerHTML={{
                      __html: job?.description || "No description available",
                    }}
                  />
                </div>

                {/* Skills */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm sm:text-base text-gray-900">
                    Required Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill: string, i: number) => (
                      <span
                        key={i}
                        className="
                          inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1.5
                          bg-blue-50 text-blue-700 border border-blue-200
                          text-xs sm:text-sm font-medium rounded-full
                          break-all
                        "
                        style={{
                          wordBreak: "break-word",
                          overflowWrap: "break-word",
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Experience */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm sm:text-base text-gray-900">
                    Experience Required
                  </h4>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center px-3 py-2 bg-gray-50 rounded-lg border">
                      <svg
                        className="w-4 h-4 text-gray-500 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-sm sm:text-base text-gray-700 font-medium">
                        {job.experience}{" "}
                        {job.experience === 1 ? "year" : "years"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Custom Fields */}
                {roles !== "" &&
                  job?.customFields &&
                  Object.keys(job.customFields).length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm sm:text-base text-gray-900">
                        Additional Information
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                        <CustomFieldsData
                          customFields={job?.customFields || {}}
                        />
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="flex-shrink-0 bg-white border-t border-gray-100">
              <div className="p-4 sm:p-5 lg:p-6">
                <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-3 sm:justify-end">
                  {/* Close button - hidden on mobile, visible on desktop */}
                  <button
                    type="button"
                    className="
                      hidden sm:inline-flex items-center justify-center
                      px-4 py-2.5 text-sm font-medium text-gray-700 
                      bg-white border border-gray-300 rounded-lg
                      hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                      transition-colors duration-200
                    "
                    onClick={onClose}
                  >
                    Close
                  </button>

                  {/* Apply button */}
                  {roles === "" ? (
                    <button
                      onClick={handleContinue}
                      disabled={alreadyApplied || readOnly}
                      className={`
                        flex items-center justify-center w-full sm:w-auto
                        px-6 py-3 sm:py-2.5 text-sm font-medium rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-offset-2
                        transition-all duration-200
                        ${
                          alreadyApplied || readOnly
                            ? "bg-gray-100 text-gray-500 border border-gray-300 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm hover:shadow-md"
                        }
                      `}
                    >
                      {alreadyApplied ? (
                        <>
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Already Applied
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                          Apply Now
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="w-full sm:w-auto">
                      {alreadyApplied || readOnly ? (
                        <button
                          disabled
                          className="
                            flex items-center justify-center w-full
                            px-6 py-3 sm:py-2.5 text-sm font-medium rounded-lg
                            bg-gray-100 text-gray-500 border border-gray-300 cursor-not-allowed
                          "
                        >
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Already Applied
                        </button>
                      ) : (
                        <div className="w-full">
                          <CreateCandidateDialog
                            jobId={job._id as string}
                            isOpen={isFormDialogOpen}
                            setIsOpen={setIsFormDialogOpen}
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
