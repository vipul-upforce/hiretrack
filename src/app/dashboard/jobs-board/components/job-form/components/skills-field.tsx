'use client';

import { useFormikContext } from 'formik';
import { Label } from '@/components/ui/label';
import { ChipInput } from '@/components/ui/chip-input';
import { JobFormValues } from '../../../schemas/job-schema';

export function SkillsField() {
  const { values, errors, touched, setFieldValue, setFieldTouched } =
    useFormikContext<JobFormValues>();

  return (
    <div className="space-y-2" id="skills">
      <Label className="font-semibold">
        Required Skills (Hit Enter to add){' '}
        <span className="text-red-500">*</span>
      </Label>
      <ChipInput
        value={values.skills}
        onChange={(newSkills) => {
          setFieldValue('skills', newSkills);
        }}
        placeholder="Add skills..."
        onSuggestionClick={(suggestion) => {
          if (!values.skills.includes(suggestion)) {
            const newSkills = [...values.skills, suggestion];
            setFieldValue('skills', newSkills);
            setFieldTouched('skills', true);
          }
        }}
      />

      {errors.skills && touched.skills && (
        <p className="text-sm text-red-500">{String(errors.skills)}</p>
      )}
    </div>
  );
}
