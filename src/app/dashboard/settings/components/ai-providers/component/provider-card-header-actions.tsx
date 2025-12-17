import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';

export type VerificationStatus = 'idle' | 'loading' | 'success' | 'error';

function VerificationIcon({ status }: { status: VerificationStatus }) {
  switch (status) {
    case 'loading':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return null;
  }
}

export function CardHeaderActions({
  status,
  isActive,
  isDisabled,
  onMakeActive,
}: {
  status: VerificationStatus;
  isActive: boolean;
  isDisabled: boolean;
  onMakeActive: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <VerificationIcon status={status} />
      <Button
        type="button"
        variant={isActive ? 'primary' : 'outline'}
        size="sm"
        onClick={onMakeActive}
        disabled={isDisabled}
      >
        {isActive ? 'Active' : 'Make Active'}
      </Button>
    </div>
  );
}
