'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type PasswordToggleInputProps = Omit<
  React.ComponentProps<typeof Input>,
  'type'
>;

/**
 * API key / secret field: toggles native input type between password and text.
 */
export function PasswordToggleInput({
  className,
  ...inputProps
}: PasswordToggleInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Input
        {...inputProps}
        type={visible ? 'text' : 'password'}
        autoComplete="off"
        className={cn('min-w-0 flex-1', className)}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        aria-label={visible ? 'Hide value' : 'Show value'}
        title={visible ? 'Hide' : 'Show'}
        onClick={() => setVisible((prev) => !prev)}
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden />
        ) : (
          <Eye className="h-4 w-4" aria-hidden />
        )}
      </Button>
    </div>
  );
}
