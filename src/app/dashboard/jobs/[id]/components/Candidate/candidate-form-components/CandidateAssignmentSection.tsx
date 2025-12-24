import { useField, useFormikContext } from 'formik';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { useFetchInterviewersQuery } from '@/lib/features/user/userApi';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { useState } from 'react';
import { RootState } from '@/lib/store';
import { CandidateFormValues } from '../../../schemas/candidate-schema';

export function CandidateAssignmentSection() {
  const { values, setFieldValue, errors } = useFormikContext<CandidateFormValues>();
  const { user } = useSelector((state: RootState) => state.auth);
  // Skip fetching interviewers unless user exists and is not a candidate
  const shouldFetchInterviewers = !!user && user.role !== 'candidate' && user.role !== '';
  const { data: interviewers } = useFetchInterviewersQuery(undefined, { skip: !shouldFetchInterviewers });
  const [timeTouched, setTimeTouched] = useState(false);

  // Only render if user has permission
  if (!user || user.role === 'candidate' || user.role === '') {
    return null;
  }

  // Get the current interviewer ID safely
  const currentInterviewerId = typeof values.assignment?.interviewerId === 'string'
    ? values.assignment.interviewerId
    : values.assignment?.interviewerId?._id || '';

  return (
    <div className="space-y-4 border-t pt-4 lg:border-t-0 lg:pt-0">
      <div className="pb-2 border-b border-gray-200 dark:border-gray-700 hidden lg:block">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <div className="w-2 h-2 bg-orange-500 rounded-full" />
          Interview Assignment
        </h3>
      </div>

      {/* Mobile Header */}
      <Label className="text-lg font-semibold lg:hidden">Assignment</Label>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Assign To
          </Label>
          <Select
            value={currentInterviewerId}
            onValueChange={(value) => setFieldValue('assignment.interviewerId', value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select interviewer" />
            </SelectTrigger>
            <SelectContent style={{ zIndex: 9999 }}>
              <SelectItem value="-1">None</SelectItem>
              {interviewers?.map((interviewer) => (
                <SelectItem key={interviewer._id} value={interviewer._id}>
                  {interviewer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.assignment && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <span className="w-1 h-1 bg-red-500 rounded-full" />
              {String(
                (errors.assignment as any).interviewerId || '',
              )}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Interview Time
          </Label>
          <DateTimePicker
            value={
              values.assignment?.time
                ? dayjs(values.assignment?.time)
                : null
            }
            onChange={(date) => {
              setFieldValue('assignment.time', date);
              setTimeTouched(true);
            }}
            placeholder="Select interview time"
          />
          {timeTouched
            && values.assignment?.time
            && new Date(values.assignment?.time) < new Date() && (
              <p className="text-sm text-orange-500 flex items-center gap-1">
                <span className="w-1 h-1 bg-orange-500 rounded-full" />
                Assignment date should not be in past
              </p>
          )}
        </div>
      </div>
    </div>
  );
}
