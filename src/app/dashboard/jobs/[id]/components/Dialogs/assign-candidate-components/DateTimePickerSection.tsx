import { Field, FieldProps, useFormikContext } from 'formik';
import { Label } from '@/components/ui/label';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { FormValues } from '../../../schemas/AssignCandidateSchema';

export function DateTimePickerSection() {
  const { setFieldValue, errors, touched } = useFormikContext<FormValues>();

  return (
    <div className="grid gap-2">
      <Label htmlFor="time">Time</Label>
      <Field name="time">
        {({ field }: FieldProps) => (
          <DateTimePicker
            value={field.value}
            onChange={(date) => setFieldValue('time', date)}
          />
        )}
      </Field>
      {typeof errors.time === 'string' && touched.time && (
        <div className="text-sm text-red-500">{errors.time}</div>
      )}
    </div>
  );
}
