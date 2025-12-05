import { useState } from 'react';
import { ErrorMessage, useFormikContext } from 'formik';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SMTPFormValues } from '../types';

export function SmtpPasswordField() {
  const { values, handleChange, handleBlur } = useFormikContext<SMTPFormValues>();
  const [showPassword, setShowPassword] = useState(false);

  if (values.mailProvider !== 'smtp') return null;

  return (
    <div className="space-y-2 relative">
      <Label htmlFor="smtp_password">SMTP Password</Label>
      <div className="relative">
        <Input
          id="smtp_password"
          name="smtp_password"
          type={showPassword ? 'text' : 'password'}
          value={values.smtp_password}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Password"
        />
        <button
          type="button"
          className="absolute right-3 top-2.5 text-gray-500"
          onClick={() => setShowPassword(!showPassword)}
        >
          {!showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      <ErrorMessage
        name="smtp_password"
        component="div"
        className="text-red-500 text-sm"
      />
    </div>
  );
}
