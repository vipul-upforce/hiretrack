'use client';

import { Button } from '@/components/ui/button';
import useRoles from '@/hooks/useRoles';
import { Dialog } from '@headlessui/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, UserPlus, LogIn } from 'lucide-react';
import { useGetPortalConfigsQuery } from '@/lib/features/settings/settingsApi';
import { useFetchOrgQuery } from '@/lib/features/org/orgApi';
import { ApplyAsGuestDialog } from './ApplyAsGuest';
import { CreateCandidateDialog } from '../dashboard/jobs/[id]/components/Dialogs/create-candidate-dialog';

// Define a type for the job object
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

  const {
    data: portalData,
    isLoading: isPortalLoading,
    error: portalError,
  } = useGetPortalConfigsQuery(undefined, { skip: !isOptionsOpen });

  const {
    data: orgResponse,
    isLoading: isOrgLoading,
    error: orgError,
  } = useFetchOrgQuery(undefined, { skip: !isOptionsOpen });

  useEffect(() => {
    if (portalData) {
      if (portalData.primaryColor) setPrimaryColor(portalData.primaryColor);
      if (portalData.secondaryColor) setSecondaryColor(portalData.secondaryColor);
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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        aria-hidden="true"
      />
      <div className="fixed inset-0 flex items-center justify-center lg:p-4 z-50">
        <Dialog.Panel className="relative w-full h-full lg:w-auto lg:h-auto lg:max-w-md transform overflow-hidden rounded-none lg:rounded-2xl bg-white dark:bg-black p-6 text-left align-middle shadow-2xl transition-all border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
          <button
            type="button"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <svg
                className="w-5 h-5"
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

          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
            You’re not currently logged in. Please choose how you’d like to
            continue with your application.
          </p>

          <div className="space-y-3">
            {roles === '' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Sign Up Button */}
                  <Button
                    onClick={handleSignupRedirect}
                    variant="outline"
                    className="w-full py-3 text-sm font-medium transition-all duration-200 border-2 hover:shadow-md"
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
                    <UserPlus className="w-4 h-4 mr-2" />
                    Sign Up
                  </Button>

                  {/* Login Button */}
                  <Button
                    onClick={handleLoginRedirect}
                    variant="outline"
                    className="w-full py-3 text-sm font-medium transition-all duration-200 border-2 hover:shadow-md"
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
                    <LogIn className="w-4 h-4 mr-2" />
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
                      className="bg-white dark:bg-black px-3 py-1 rounded-full text-xs font-medium"
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
                <div className="w-full flex justify-center">
                  <ApplyAsGuestDialog
                    jobId={job._id as string}
                    isOpen={isFormDialogOpen}
                    setIsOpen={setIsFormDialogOpen}
                    closeParent={onClose}
                    jobTitle={job.title}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                  />
                </div>
              </>
            ) : (
              <>
                {readOnly ? (
                  <Button
                    disabled
                    className="w-full py-2.5 text-sm font-medium bg-gray-100 dark:bg-black text-gray-500 dark:text-gray-400 cursor-not-allowed"
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
