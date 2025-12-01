import { Field, FieldProps, useFormikContext } from "formik";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/DateTimePicker";

export function DateTimePickerSection() {
  const { setFieldValue, errors, touched } = useFormikContext<any>();

  return (
    <div className="grid gap-2">
      <Label htmlFor="time">Time</Label>
      <Field name="time">
        {({ field }: FieldProps) => (
          <DateTimePicker
            value={field.value}
            onChange={(date) => setFieldValue("time", date)}
          />
        )}
      </Field>
      {typeof errors.time === "string" && touched.time && (
        <div className="text-red-500 text-sm">{errors.time}</div>
      )}
    </div>
  );
}

