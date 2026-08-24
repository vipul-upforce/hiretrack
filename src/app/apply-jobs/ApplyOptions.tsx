'use client';

import { CustomFieldValues } from '@/Custom_Fields/hooks/useCustomForm';
import { Button } from '@/components/ui/button';
import useRoles from '@/hooks/useRoles';
import { Dialog } from '@headlessui/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, UserPlus, LogIn } from 'lucide-react';
import { useGetPortalConfigsQuery } from '@/lib/features/settings';
import { useFetchOrgQuery } from '@/lib/features/org/orgApi';
import { ApplyAsGuestDialog } from './ApplyAsGuest';
import type { JobExperience } from '@/lib/utils/job-experience';
import { CreateCandidateDialog } from '../dashboard/jobs/[id]/components/Dialogs/create-candidate-dialog';

// Define a type for the job object
interface Job {
  title: string;
  description: string;
  skills: string[];
  experience: JobExperience | number;
  customFields?: CustomFieldValues;
  _id?: string;
}

interface JobModalProps {
  job: Job | null;
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
  const [primaryColor, setPrimaryColor] = useState<string>('#6366f1');
  const [secondaryColor, setSecondaryColor] = useState<string>('#8b5cf6');

  const roles = useRoles();
  const router = useRouter();

  const { data: portalData } = useGetPortalConfigsQuery(undefined, {
    skip: !isOptionsOpen,
  });

  const { data: orgResponse } = useFetchOrgQuery(undefined, {
    skip: !isOptionsOpen,
  });

  useEffect(() => {
    if (portalData) {
      if (portalData.primaryColor) setPrimaryColor(portalData.primaryColor);
      if (portalData.secondaryColor)
        setSecondaryColor(portalData.secondaryColor);
    }
  }, [portalData]);

  if (!job) return null;

  const handleSignupRedirect = () => {
    if (orgResponse && orgResponse.allow === false) {
      router.push('/signup');
      return;
    }
    router.push(`/signup?o=${orgName}`);
  };

  const handleLoginRedirect = () => {
    router.push('/auth/login');
  };

  return (
    <Dialog open={isOptionsOpen} onClose={onClose}>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center lg:p-4">
        <Dialog.Panel className="relative h-full w-full transform overflow-hidden rounded-none border border-gray-200 bg-white p-6 text-left align-middle shadow-2xl backdrop-blur-sm transition-all dark:border-gray-700 dark:bg-black lg:h-auto lg:w-auto lg:max-w-md lg:rounded-2xl">
          <button
            type="button"
            className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-4 flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: primaryColor }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <Dialog.Title
              as="h3"
              className="text-xl font-bold text-gray-900 dark:text-white"
            >
              Authentication Required
            </Dialog.Title>
          </div>

          <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            You’re not currently logged in. Please choose how you’d like to
            continue with your application.
          </p>

          <div className="space-y-3">
            {roles === '' ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Sign Up Button */}
                  <Button
                    onClick={handleSignupRedirect}
                    variant="outline"
                    className="w-full border-2 py-3 text-sm font-medium transition-all duration-200 hover:shadow-md"
                    style={{
                      borderColor: primaryColor,
                      color: primaryColor,
                    }}
                    onMouseEnter={(e) => {
                      const target = e.target as HTMLElement;
                      target.style.backgroundColor = primaryColor;
                      target.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      const target = e.target as HTMLElement;
                      target.style.backgroundColor = 'transparent';
                      target.style.color = primaryColor;
                    }}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Sign Up
                  </Button>

                  {/* Login Button */}
                  <Button
                    onClick={handleLoginRedirect}
                    variant="outline"
                    className="w-full border-2 py-3 text-sm font-medium transition-all duration-200 hover:shadow-md"
                    style={{
                      borderColor: secondaryColor,
                      color: secondaryColor,
                    }}
                    onMouseEnter={(e) => {
                      const target = e.target as HTMLElement;
                      target.style.backgroundColor = secondaryColor;
                      target.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      const target = e.target as HTMLElement;
                      target.style.backgroundColor = 'transparent';
                      target.style.color = secondaryColor;
                    }}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Button>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200 dark:border-gray-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span
                      className="rounded-full bg-white px-3 py-1 text-xs font-medium dark:bg-black"
                      style={{
                        color: `${primaryColor}90`,
                        border: `1px solid ${primaryColor}70`,
                      }}
                    >
                      Or
                    </span>
                  </div>
                </div>

                {/* Guest Apply */}
                <div className="flex w-full justify-center">
                  <ApplyAsGuestDialog
                    jobId={job._id as string}
                    isOpen={isFormDialogOpen}
                    setIsOpen={setIsFormDialogOpen}
                    closeParent={onClose}
                    jobTitle={job.title}
                    primaryColor={primaryColor}
                  />
                </div>
              </>
            ) : (
              <span>
                {readOnly ? (
                  <Button
                    disabled
                    className="w-full cursor-not-allowed bg-gray-100 py-2.5 text-sm font-medium text-gray-500 dark:bg-black dark:text-gray-400"
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
              </span>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
