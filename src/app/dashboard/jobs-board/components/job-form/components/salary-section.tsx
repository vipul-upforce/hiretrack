'use client';

import { useFormikContext } from 'formik';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { JobFormValues } from '../../../schemas/job-schema';

export function SalarySection() {
  const { values, handleChange, handleBlur, setFieldValue } =
    useFormikContext<JobFormValues>();

  return (
    <div className="space-y-2">
      <Label className="font-semibold">Salary</Label>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Input
            id="salary.inText"
            name="salary.inText"
            type="text"
            value={values.salary?.inText || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter salary or salary range"
            min="0"
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="salary.isPrivate"
            checked={values.salary?.isPrivate === true}
            onCheckedChange={(checked) => {
              setFieldValue('salary.isPrivate', checked);
            }}
            onBlur={handleBlur}
          />
          <Label className="m-0 mt-0 p-0" htmlFor="salary.isPrivate">
            Keep Salary Private
          </Label>
        </div>
      </div>
    </div>
  );
}
