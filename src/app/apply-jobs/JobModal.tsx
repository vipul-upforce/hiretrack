import { CreateCandidateDialog } from "@/app/dashboard/jobs/[id]/components/create-candidate-dialog";
import { Button } from "@/components/ui/button";
import CustomFieldsData from "@/Custom_Fields/Components/CustomFields/customFields-details";
import useRoles from "@/hooks/useRoles";
import { Dialog } from "@headlessui/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ExpandableDescription from "@/app/dashboard/jobs/[id]/components/expand-collapse-desc";
import ApplyOptions from "./ApplyOptions";

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
  const roles = useRoles();
  const router = useRouter();

  useEffect(() => {
    if (isPendingOptionsOpen && !isOpen) {
      setIsModalOpen(true);
      setIsPendingOptionsOpen(false);
    }
  }, [isOpen, isPendingOptionsOpen]);

  if (!job) return null;

  const handleSignupRedirect = async () => {
    const data = await fetch("/api/organization");
    if (!data.ok) {
      return;
    }
    const allowance = await data.json();
    if (!allowance.allow) {
      return router.push("/signup");
    }
    router.push("/signup?o=" + orgName);
  };

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
          <Dialog.Panel className="w-[50vw] transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all max-h-[80vh] overflow-y-auto ">
            <Dialog.Title
              as="h3"
              className="text-lg font-bold leading-6 text-gray-900 top-0 break-words"
            >
              {job.title}
            </Dialog.Title>
            <div className="mt-2 ">
              <ExpandableDescription
                description={job.description || "No description Found"}
              />
              <div className="mt-4">
                <h4 className="font-bold">Required Skills:</h4>
                <div className="flex flex-wrap gap-2 mt-2">
                  {job.skills.map((skill: string, i: number) => (
                    <span
                      key={i}
                      className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
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
            <div className="mt-6 flex justify-end gap-3">
              {roles === "" ? (
                <>
                  <Button onClick={handleContinue}>Continue</Button>
                </>
              ) : (
                <>
                  {readOnly ? (
                    <Button onClick={handleSignupRedirect} disabled>
                      Applied
                    </Button>
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
                className="inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
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
        readOnly={false}
      />
    </>
  );
}
