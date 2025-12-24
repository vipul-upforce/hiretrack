import { User } from 'lucide-react';

interface GuestApplyTriggerProps {
  hasAlreadyApplied: boolean;
  isSendingEmail: boolean;
  primaryColor: string;
  onClick: () => void;
}

function getButtonContent(
  hasAlreadyApplied: boolean,
  isSendingEmail: boolean,
  primaryColor: string,
) {
  if (isSendingEmail && !hasAlreadyApplied) {
    return (
      <>
        <div
          className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2"
          style={{ borderColor: primaryColor }}
        />
        Processing...
      </>
    );
  }

  if (hasAlreadyApplied) {
    return (
      <>
        <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        Applied
      </>
    );
  }

  return (
    <>
      <User className="mr-2 h-4 w-4" />
      Apply As Guest
    </>
  );
}

export function GuestApplyTrigger({
  hasAlreadyApplied,
  isSendingEmail,
  primaryColor,
  onClick,
}: GuestApplyTriggerProps) {
  return (
    <button
      type="button"
      disabled={isSendingEmail || hasAlreadyApplied}
      className="inline-flex w-full items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:w-fit"
      style={
        hasAlreadyApplied
          ? {
              backgroundColor: '#f3f4f6',
              color: '#6b7280',
              border: '1px solid #d1d5db',
            }
          : {
              backgroundColor: `${primaryColor}15`,
              color: primaryColor,
              border: `2px solid ${primaryColor}`,
            }
      }
      onMouseEnter={(e) => {
        if (!hasAlreadyApplied && !isSendingEmail) {
          const target = e.target as HTMLElement;
          target.style.backgroundColor = primaryColor;
          target.style.color = 'white';
        }
      }}
      onMouseLeave={(e) => {
        if (!hasAlreadyApplied && !isSendingEmail) {
          const target = e.target as HTMLElement;
          target.style.backgroundColor = `${primaryColor}15`;
          target.style.color = primaryColor;
        }
      }}
      onClick={onClick}
    >
      {getButtonContent(hasAlreadyApplied, isSendingEmail, primaryColor)}
    </button>
  );
}
