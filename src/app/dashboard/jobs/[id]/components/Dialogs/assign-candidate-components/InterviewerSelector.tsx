import { Field, FieldProps, useFormikContext } from 'formik';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User } from '@/lib/features/users/usersApi';
import { Interviewer } from '@/lib/features/user/userApi';

interface InterviewerSelectorProps {
  interviewers: Interviewer[] | undefined;
}

export function InterviewerSelector({ interviewers }: InterviewerSelectorProps) {
  const { setFieldValue, errors, touched } = useFormikContext<any>();

  return (
    <div className="grid gap-2">
      <Label htmlFor="interviewerId">Assign To</Label>
      <Field name="interviewerId">
        {({ field }: FieldProps) => (
          <Select
            value={field.value}
            onValueChange={(value) => setFieldValue('interviewerId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select interviewer" />
            </SelectTrigger>
            <SelectContent>
              {interviewers?.map((interviewer) => (
                <SelectItem key={interviewer._id} value={interviewer._id}>
                  {interviewer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>
      {errors.interviewerId && touched.interviewerId && (
        <div className="text-red-500 text-sm">
          {errors.interviewerId as string}
        </div>
      )}
    </div>
  );
}
