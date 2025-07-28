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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        aria-hidden="true"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <Dialog.Panel className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-6 text-left align-middle shadow-2xl transition-all border border-gray-200 dark:border-gray-700">
          <button
            type="button"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <Dialog.Title
              as="h3"
              className="text-xl font-bold text-gray-900 dark:text-white"
            >
              Authentication Required
            </Dialog.Title>
          </div>

          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
            You're not currently logged in. Please choose how you'd like to continue with your application.
          </p>

          <div className="space-y-3">
            {roles === "" ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button 
                    onClick={handleSignupRedirect} 
                    variant="outline"
                    className="w-full py-2.5 text-sm font-medium border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Sign Up
                  </Button>
                  <Button 
                    onClick={handleLoginRedirect} 
                    variant="outline"
                    className="w-full py-2.5 text-sm font-medium border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Login
                  </Button>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200 dark:border-gray-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-gray-900 px-2 text-gray-500 dark:text-gray-400">Or</span>
                  </div>
                </div>
                <div className="w-full flex justify-center">
                  <ApplyAsGuestDialog
                    jobId={job._id as string}
                    isOpen={isFormDialogOpen}
                    setIsOpen={setIsFormDialogOpen}
                    closeParent={onClose}
                    jobTitle={job.title}
                  />
                </div>
              </>
            ) : (
              <>
                {readOnly ? (
                  <Button 
                    disabled
                    className="w-full py-2.5 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  >
                    Already Applied
                  </Button>
                ) : (
                  <CreateCandidateDialog
                    jobId={job._id as string}
                    isOpen={isFormDialogOpen}
                    setIsOpen={setIsFormDialogOpen}
                    jobTitle={job.title}
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
