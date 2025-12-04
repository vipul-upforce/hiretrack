import { ErrorMessage, useFormikContext } from 'formik';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FORM_FIELDS } from '../constants';
import { SMTPFormValues } from '../types';

export function DynamicInputs() {
  const { values, handleChange, handleBlur } = useFormikContext<SMTPFormValues>();

  return (
    <>
      {FORM_FIELDS.filter(
        (field) => field.condition === values.mailProvider,
      ).map(({ label, name, placeholder }) => (
        <div key={name} className="space-y-2">
          <Label htmlFor={name}>{label}</Label>
          <Input
            id={name}
            name={name}
            value={values[name]}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
          />
          <ErrorMessage
            name={name}
            component="div"
            className="text-red-500 text-sm"
          />
        </div>
      ))}
    </>
  );
}
