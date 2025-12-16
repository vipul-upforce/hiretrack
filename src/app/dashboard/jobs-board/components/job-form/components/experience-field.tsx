'use client';

import { useFormikContext } from 'formik';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React from 'react';
import { JobFormValues } from '../../../schemas/job-schema';

export function ExperienceField() {
  const { values, errors, touched, handleBlur, setFieldValue } =
    useFormikContext<JobFormValues>();

  return (
    <div className="space-y-2">
      <Label htmlFor="experience" className="font-semibold">
        Experience (years) <span className="text-red-500">*</span>
      </Label>
      <Input
        id="experience"
        name="experience"
        type="number"
        step="0.01"
        value={values.experience}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const value = parseFloat(e.target.value);
          setFieldValue(
            'experience',
            value && !Number.isNaN(value) ? value : '',
          );
        }}
        onBlur={handleBlur}
        placeholder="e.g., 5"
        min="0"
      />
      {touched.experience && errors.experience && (
        <p className="text-sm text-red-500">{errors.experience}</p>
      )}
    </div>
  );
}
