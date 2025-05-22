import { CreateCandidateDialog } from "../dashboard/jobs/[id]/components/Dialogs/create-candidate-dialog";
import CustomFieldsData from "@/Custom_Fields/Components/CustomFields/customFields-details";
import useRoles from "@/hooks/useRoles";
import { Dialog } from "@headlessui/react";
import { useState, useEffect } from "react";
import ApplyOptions from "./ApplyOptions";
import { hasAppliedAsGuest } from "./ApplyAsGuest";

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
  // const router = useRouter();

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
        <div
          className="fixed inset-0 bg-black bg-opacity-25"
          aria-hidden="true"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4 h-[100vh]">
          <Dialog.Panel className="w-full sm:w-[80vw] md:w-[70vw] lg:w-[50vw] transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all max-h-[80vh] relative">
            <div className="sticky top-0 bg-white p-4 sm:p-6 sm:py-3 sm:pt-4 sm:pb-2 z-10">
              <Dialog.Title
                as="h3"
                className="text-lg font-bold leading-6 text-gray-900 break-words"
              >
                {job.title}
              </Dialog.Title>
              {/* <hr className="mt-2" /> */}
            </div>

            <div className="p-4 sm:p-6 sm:pt-0 pb-20 overflow-y-auto max-h-[calc(80vh-120px)] border-t border-gray-100">
              <div className="mt-2 mb-10">
                <p className="w-full whitespace-pre-wrap ">
                  {job.description || "No description Found"}
                </p>
                <div className="mt-4">
                  <h4 className="font-bold">Required Skills:</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {job.skills.map((skill: string, i: number) => (
                      <span
                        key={i}
                        className="break-all bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <h4 className="font-bold">Experience Required:</h4>
                  <p className="mt-1">{job.experience} years</p>
                </div>
                {roles !== "" && (
                  <div className="mt-4">
                    <CustomFieldsData customFields={job?.customFields || {}} />
                  </div>
                )}
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-white p-4 sm:p-6 sm:py-3 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              {roles === "" ? (
                <>
                  <button
                    onClick={handleContinue}
                    disabled={alreadyApplied || readOnly}
                    className={`w-full sm:w-auto inline-flex justify-center rounded-md border ${
                      alreadyApplied || readOnly
                        ? "border-gray-300 bg-gray-100 text-gray-500"
                        : "border-transparent bg-blue-100 text-blue-900 hover:bg-blue-200"
                    } px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
                  >
                    {alreadyApplied ? "Already Applied" : "Apply Now"}
                  </button>
                </>
              ) : (
                <>
                  {alreadyApplied || readOnly ? (
                    <button
                      disabled
                      className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500"
                    >
                      Already Applied
                    </button>
                  ) : (
                    <CreateCandidateDialog
                      jobId={job._id as string}
                      isOpen={isFormDialogOpen}
                      setIsOpen={setIsFormDialogOpen}
                    />
                  )}
                </>
              )}

              <button
                type="button"
                className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                onClick={onClose}
              >
                Close
              </button>
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
