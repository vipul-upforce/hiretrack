import React, { useState } from 'react';
import { Field, FieldProps } from 'formik';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, LucideIcon } from 'lucide-react';

interface BaseFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  icon?: LucideIcon;
  disabled?: boolean;
}

function ErrorMessage({ name }: { name: string }) {
  return (
    <Field name={name}>
      {({ meta }: FieldProps) =>
        meta.touched && meta.error ? (
          <div className="mt-1 text-xs text-red-500">{meta.error}</div>
        ) : null
      }
    </Field>
  );
}

export function FormInputField({
  name,
  label,
  placeholder,
  icon: Icon,
  disabled,
}: BaseFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Field name={name}>
        {({ field, meta }: FieldProps) => (
          <div className="relative">
            {Icon && (
              <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            )}
            <Input
              {...field}
              id={name}
              placeholder={placeholder}
              disabled={disabled}
              className={`${Icon ? 'pl-10' : ''} ${
                meta.touched && meta.error ? 'border-red-500' : ''
              }`}
            />
          </div>
        )}
      </Field>
      <ErrorMessage name={name} />
    </div>
  );
}

export function FormPasswordField({
  name,
  label,
  icon: Icon,
  disabled,
}: BaseFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <Field name={name}>
          {({ field, meta }: FieldProps) => (
            <>
              {Icon && (
                <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              )}
              <Input
                {...field}
                id={name}
                type={showPassword ? 'text' : 'password'}
                disabled={disabled}
                className={`${Icon ? 'pl-10' : ''} pr-10 ${
                  meta.touched && meta.error ? 'border-red-500' : ''
                }`}
              />
            </>
          )}
        </Field>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
      <ErrorMessage name={name} />
    </div>
  );
}
