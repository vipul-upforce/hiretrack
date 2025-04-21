import { CreateCandidateDialog } from "@/app/dashboard/jobs/[id]/components/create-candidate-dialog";
import { Button } from "@/components/ui/button";
import useRoles from "@/hooks/useRoles";
import { Dialog } from "@headlessui/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApplyAsGuestDialog } from "./ApplyAsGuest";
import { X } from "lucide-react";

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
  isOptionsOpen: boolean;
  onClose: () => void;
  orgName: string;
  readOnly: boolean;
}

export default function ApplyOptions({
  job,
  isOptionsOpen,
  onClose,
  orgName,
  readOnly,
}: JobModalProps) {
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const roles = useRoles();
  const router = useRouter();

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
  const handleLoginRedirect = async () => {
    // const data = await fetch("/api/organization");
    // if (!data.ok) {
    //   return;
    // }
    // const allowance = await data.json();
    // if (!allowance.allow) {
    //   return router.push("/signup");
    // }
    router.push("/auth/login");
  };

  return (
    <Dialog open={isOptionsOpen} onClose={onClose}>
      <div
        className="fixed inset-0 bg-black bg-opacity-25"
        aria-hidden="true"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4 h-[100vh]">
        <Dialog.Panel className="w-[30vw] transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all max-h-[80vh] overflow-y-auto ">
          <Dialog.Title
            as="h3"
            className="text-lg font-bold leading-6 text-gray-900 top-0 break-words"
          >
            Alert
          </Dialog.Title>

          <p className="text-gray-500 text-md mt-2">
            Currently, You are not logged in. Please choose how you want to
            continue.
          </p>

          <div className="mt-6 flex justify-end gap-3">
            {roles === "" ? (
              <div className="flex justify-between flex-row w-full">
                <div className="">
                  <Button className="mr-2" onClick={handleSignupRedirect}>
                    Sign Up
                  </Button>
                  <Button onClick={handleLoginRedirect}>Login</Button>
                </div>
                <div>
                  <ApplyAsGuestDialog
                    jobId={job._id as string}
                    isOpen={isFormDialogOpen}
                    setIsOpen={setIsFormDialogOpen}
                  />
                </div>
                {/* <Button onClick={() => setIsJobModelOpen(!isJobModelOpen)}>
                  Continue Without Signup
                </Button> */}

                {/* <JobModal
                  job={job}
                  isOpen={isJobModelOpen}
                  onClose={() => setIsJobModelOpen(!isJobModelOpen)}
                  orgName={orgName}
                  readOnly={false}
                /> */}
              </div>
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
              //   className="inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
              className="absolute top-4 text-gray-500 hover:text-gray-800 w-4 h-4"
              onClick={onClose}
            >
              <X width={15} />
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
