import { CreateCandidateDialog } from "../dashboard/jobs/[id]/components/Dialogs/create-candidate-dialog";
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
      <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-2 h-[100vh]">
        <Dialog.Panel className="relative w-[90vw] sm:w-[80vw] md:w-[60vw] lg:w-[40vw] xl:w-[30vw] transform overflow-hidden rounded-2xl bg-white p-6 sm:p-4 text-left align-middle shadow-xl transition-all max-h-[80vh] overflow-y-auto">
          <button
            type="button"
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 w-4 h-4"
            onClick={onClose}
          >
            <X width={15} />
          </button>

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

          <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-3">
            {roles === "" ? (
              <div className="flex flex-col sm:flex-row sm:justify-between w-full gap-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={handleSignupRedirect}>Sign Up</Button>
                  <Button onClick={handleLoginRedirect}>Login</Button>
                </div>
                <div>
                  <ApplyAsGuestDialog
                    jobId={job._id as string}
                    isOpen={isFormDialogOpen}
                    setIsOpen={setIsFormDialogOpen}
                    closeParent={onClose}
                  />
                </div>
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
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
