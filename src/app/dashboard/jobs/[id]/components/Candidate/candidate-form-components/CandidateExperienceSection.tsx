import { useField, useFormikContext } from 'formik';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CandidateExperienceSection() {
  const { submitCount } = useFormikContext();
  const [experienceField, experienceMeta] = useField('experience');
  const [relevantExperienceField, relevantExperienceMeta] = useField(
    'relevantExperience',
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div
        className="space-y-2 col-span-1"
        data-form-field="relevantExperience"
      >
        <Label
          htmlFor="relevantExperience"
          className="text-sm font-semibold text-gray-900 dark:text-gray-100"
        >
          Relevant Exp in Years
          {' '}
          <span className="text-red-500">*</span>
        </Label>
        <Input
          id="relevantExperience"
          placeholder="Enter relevant exp"
          type="text"
          inputMode="decimal"
          pattern="^\d+(\.\d+)?$"
          {...relevantExperienceField}
          className={`h-9 px-3 transition-all duration-200 w-full lg:max-w-xs ${relevantExperienceMeta.error && (relevantExperienceMeta.touched || submitCount > 0)
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20'
            }`}
        />
        {(relevantExperienceMeta.touched || submitCount > 0) && relevantExperienceMeta.error && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <span className="w-1 h-1 bg-red-500 rounded-full" />
            {relevantExperienceMeta.error}
          </p>
        )}
      </div>

      <div className="space-y-2 col-span-1" data-form-field="experience">
        <Label
          htmlFor="experience"
          className="text-sm font-semibold text-gray-900 dark:text-gray-100"
        >
          Total Exp in Years
          {' '}
          <span className="text-red-500">*</span>
        </Label>
        <Input
          id="experience"
          placeholder="Enter total exp"
          type="text"
          inputMode="decimal"
          pattern="^\d+(\.\d+)?$"
          {...experienceField}
          className={`h-9 px-3 transition-all duration-200 w-full lg:max-w-xs ${experienceMeta.error && (experienceMeta.touched || submitCount > 0)
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20'
            }`}
        />
        {(experienceMeta.touched || submitCount > 0) && experienceMeta.error && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <span className="w-1 h-1 bg-red-500 rounded-full" />
            {experienceMeta.error}
          </p>
        )}
      </div>
    </div>
  );
}
