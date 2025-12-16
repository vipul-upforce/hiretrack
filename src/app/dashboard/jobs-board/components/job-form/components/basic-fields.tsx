'use client';

import { useFormikContext } from 'formik';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import RichTextEditor from '@/components/ui/rte/RichTextEditor';
import { JobFormValues } from '../../../schemas/job-schema';

export function BasicFields() {
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldTouched,
  } = useFormikContext<JobFormValues>();

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="title" className="font-semibold">
          Job Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          name="title"
          value={values.title}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="e.g., Senior Frontend Developer"
        />
        {touched.title && errors.title && (
          <p className="text-sm text-red-500">{errors.title}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status" className="font-semibold">
          Status <span className="text-red-500">*</span>
        </Label>
        <Select
          value={values.status}
          onValueChange={(value) => setFieldValue('status', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        {touched.status && errors.status && (
          <p className="text-sm text-red-500">{errors.status}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="font-semibold">
          Description <span className="text-red-500">*</span>
        </Label>
        <RichTextEditor
          id="description"
          name="description"
          placeholder="Enter job description..."
          className="min-h-[100px] p-3"
          maxLength={10000}
          value={values?.description || ''}
          onChange={(val) => setFieldValue('description', val)}
          onBlur={() => setFieldTouched('description', true)}
        />
        {errors.description && touched.description && (
          <p className="text-sm text-red-500">{String(errors.description)}</p>
        )}
      </div>
    </>
  );
}
