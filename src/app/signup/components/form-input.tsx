'use client';

import React, { useState } from 'react';
import { Field, FieldProps, FormikErrors, FormikTouched } from 'formik';
import { Eye, EyeOff, LucideIcon } from 'lucide-react';

interface FormInputProps {
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  icon: LucideIcon;
  primaryColor: string;
  disabled: boolean;
  errors: FormikErrors<any>;
  touched: FormikTouched<any>;
}

export function FormInput({
  name,
  label,
  placeholder,
  type = 'text',
  icon: Icon,
  primaryColor,
  disabled,
  errors,
  touched,
}: FormInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const passwordType = showPassword ? 'text' : 'password';
  const inputType = isPassword ? passwordType : type;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      <div className="relative">
        <Icon className="absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 transform text-muted-foreground" />

        <Field name={name}>
          {({ field }: FieldProps) => (
            <input
              {...field}
              type={inputType}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full rounded-lg border border-border bg-background/50 py-3 pl-10 pr-12 transition-all focus:border-current focus:outline-none focus:ring-2"
              style={
                {
                  '--tw-ring-color': `${primaryColor}50`,
                  '--tw-border-opacity': '1',
                } as React.CSSProperties
              }
              onFocus={(e) => {
                e.target.style.borderColor = primaryColor;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '';
              }}
            />
          )}
        </Field>

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 transform text-muted-foreground transition-colors hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        )}
      </div>

      {errors.name && touched.name && (
        <div className="mt-1 text-sm text-red-500">{errors.name as string}</div>
      )}
    </div>
  );
}
