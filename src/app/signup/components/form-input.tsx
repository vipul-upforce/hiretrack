"use client";

import React, { useState } from "react";
import { Field, FieldProps, FormikErrors, FormikTouched } from "formik";
import { Eye, EyeOff, LucideIcon } from "lucide-react";

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

export const FormInput = ({
  name,
  label,
  placeholder,
  type = "text",
  icon: Icon,
  primaryColor,
  disabled,
  errors,
  touched,
}: FormInputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      <div className="relative">
        <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />

        <Field name={name}>
          {({ field }: FieldProps) => (
            <input
              {...field}
              type={inputType}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full pl-10 pr-12 py-3 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:border-current transition-all"
              style={
                {
                  "--tw-ring-color": `${primaryColor}50`,
                  "--tw-border-opacity": "1",
                } as React.CSSProperties
              }
              onFocus={(e) => (e.target.style.borderColor = primaryColor)}
              onBlur={(e) => (e.target.style.borderColor = "")}
            />
          )}
        </Field>

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>

      {errors[name] && touched[name] && (
        <div className="text-sm text-red-500 mt-1">
          {errors[name] as string}
        </div>
      )}
    </div>
  );
};
