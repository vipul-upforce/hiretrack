import { useState } from 'react';
import { useFormikContext } from 'formik';
import { useSanitizeFiles } from '@/hooks/useSanitizeFiles';
import { useAppSelector } from '@/lib/redux/hooks';
import { useAltEnterSubmit } from '@/lib/utils/useAltEnterSubmit';
import { Candidate } from '@/types/candidate';
import { Interviewer } from '@/lib/features/user/userApi';
import { FormValues } from '../../../../schemas/AssignCandidateSchema';

interface UseZoomMeetIntegrationProps {
  candidate: Candidate;
}

export function useZoomMeetIntegration({ candidate }: UseZoomMeetIntegrationProps) {
  const { user } = useAppSelector((state) => state.auth || {});
  const formikContext = useFormikContext<FormValues>();
  const { values, setFieldValue } = formikContext;
  const [isEditMode, setIsEditMode] = useState(false);
  const [newGuest, setNewGuest] = useState('');
  const [emailError, setEmailError] = useState('');
  const { sanitizeFiles: contextSanitizeFiles } = useSanitizeFiles();
  const { sanitizeFiles: localSanitizeFiles } = useSanitizeFiles();
  const sanitizeFiles = contextSanitizeFiles || localSanitizeFiles;
  const getOnAltEnterSubmit = useAltEnterSubmit();

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleAddGuest = () => {
    if (!newGuest) {
      setEmailError('Please enter an email address');
      return;
    }
    if (!validateEmail(newGuest)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    const currentGuests = values.zoomAdditionalGuests || [];
    if (currentGuests.includes(newGuest)) {
      setEmailError('This email is already in the guest list');
      return;
    }
    setFieldValue('zoomAdditionalGuests', [...currentGuests, newGuest]);
    setNewGuest('');
    setEmailError('');
  };

  const handleRemoveGuest = (email: string) => {
    const currentGuests = values.zoomAdditionalGuests || [];
    setFieldValue(
      'zoomAdditionalGuests',
      currentGuests.filter((g) => g !== email),
    );
  };

  const getDefaultGuests = (selectedInterviewer: Interviewer) => {
    const defaultGuests = [];
    if (selectedInterviewer?.email)
      defaultGuests.push(selectedInterviewer.email);
    if (candidate.email) defaultGuests.push(candidate.email);
    if (user?.email && user.email !== selectedInterviewer?.email) {
      defaultGuests.push(user.email);
    }
    return defaultGuests;
  };

  const hasExistingMeet = !!candidate.assignment?.zoomMeet?.meetingId;

  return {
    user,
    values,
    setFieldValue,
    isEditMode,
    setIsEditMode,
    newGuest,
    setNewGuest,
    emailError,
    setEmailError,
    sanitizeFiles,
    getOnAltEnterSubmit,
    validateEmail,
    handleAddGuest,
    handleRemoveGuest,
    getDefaultGuests,
    hasExistingMeet,
  };
}
