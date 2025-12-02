import { useField, useFormikContext } from "formik";
import { Label } from "@/components/ui/label";
import { ChipInput } from "@/components/ui/chip-input";

export function CandidateSkillsSection() {
  const { setFieldValue, submitCount } = useFormikContext();
  const [skillsField, skillsMeta] = useField("skills");

  return (
    <div className="space-y-4">
      <div className="pb-2 border-b border-gray-200 dark:border-gray-700 hidden lg:block">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          Technical Skills
        </h3>
      </div>
      <div className="space-y-2" id="skills" data-form-field="skills">
        <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Skills (Type and press Enter, comma, or space){" "}
          <span className="text-red-500">*</span>
        </Label>
        <ChipInput
          placeholder="Type skills separated by comma, space, or press Enter"
          value={skillsField.value}
          onChange={(skills) => setFieldValue("skills", skills)}
          onSuggestionClick={(suggestion) => {
            setFieldValue("skills", [...skillsField.value, suggestion]);
          }}
          showAddButton={true}
        />
        {(skillsMeta.touched || submitCount > 0) && skillsMeta.error && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <span className="w-1 h-1 bg-red-500 rounded-full"></span>
            {skillsMeta.error}
          </p>
        )}
      </div>
    </div>
  );
}

