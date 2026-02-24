'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { ErrorMessage, useFormikContext } from 'formik';
import { Label } from '@/components/ui/label';

interface SecretInputProps {
  name: string;
  label: string;
}

export function SecretInput({ name, label }: SecretInputProps) {
  const [show, setShow] = useState(false);
  const { values, setFieldValue } = useFormikContext<{ name: string }>();

  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <Input
          id={name}
          name={name}
          type={show ? 'text' : 'password'}
          value={values.name}
          onChange={(e) => setFieldValue(name, e.target.value.trim())}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 hover:bg-transparent"
          onClick={() => setShow(!show)}
        >
          {show ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
      </div>
      <ErrorMessage
        name={name}
        component="div"
        className="text-sm text-red-500"
      />
    </div>
  );
}
