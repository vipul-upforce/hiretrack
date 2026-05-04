'use client';

import { useFormikContext } from 'formik';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { parseSalaryInputToLPA, type SalaryLPAResult } from '@/lib/ctc-normalizer';
import { useState, useEffect } from 'react';
import { JobFormValues } from '../schemas/job-schema';

export function JobFormSalaryField() {
  const { values, handleChange, handleBlur, setFieldValue, submitCount } =
    useFormikContext<JobFormValues>();
  const [convertedSalary, setConvertedSalary] = useState<SalaryLPAResult | null>(null);
  const [showSalaryHint, setShowSalaryHint] = useState(false);

  /** Only on submit: normalize and set salary min, max, inText */
  useEffect(() => {
    if (submitCount > 0 && values.salary?.inText?.trim()) {
      const result = parseSalaryInputToLPA(values.salary.inText);
      setFieldValue('salary', {
        ...values.salary,
        min: result.min,
        max: result.max,
        inText: result.displayText,
        isPrivate: values.salary?.isPrivate ?? false,
      });
    }
  }, [submitCount]);

  const updateHintFromInput = (rawInput: string) => {
    const trimmed = rawInput?.trim() ?? '';
    if (!trimmed) {
      setConvertedSalary(null);
      setShowSalaryHint(false);
      return;
    }
    const result = parseSalaryInputToLPA(trimmed);
    setConvertedSalary(result);
    setShowSalaryHint(true);
  };

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
            onChange={(e) => {
              handleChange(e);
              updateHintFromInput(e.target.value);
            }}
            onBlur={(e) => {
              updateHintFromInput(e.target.value);
              handleBlur(e);
            }}
            placeholder="Enter salary or salary range"
          />
          {showSalaryHint && convertedSalary && (convertedSalary.min !== 0 || convertedSalary.max !== 0) && (
            <p className="mt-1 flex items-center gap-1 text-sm text-orange-500">
              <span className="h-1 w-1 rounded-full bg-orange-500" />
              Will be saved as{' '}
              {convertedSalary.min === convertedSalary.max
                ? `${convertedSalary.min} LPA`
                : `${convertedSalary.min} - ${convertedSalary.max} LPA`}
            </p>
          )}
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
