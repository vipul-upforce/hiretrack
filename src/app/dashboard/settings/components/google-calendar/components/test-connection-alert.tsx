import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, X } from 'lucide-react';
import { TestResult } from '../types';

interface TestConnectionAlertProps {
  result: TestResult;
}

export function TestConnectionAlert({ result }: TestConnectionAlertProps) {
  return (
    <Alert
      className={
        result.success
          ? 'border-green-200 bg-green-50 dark:bg-green-950/20'
          : 'border-red-200 bg-red-50 dark:bg-red-950/20'
      }
    >
      {result.success ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <X className="h-4 w-4 text-red-600" />
      )}
      <AlertTitle
        className={
          result.success
            ? 'text-green-800 dark:text-green-300'
            : 'text-red-800 dark:text-red-300'
        }
      >
        Connection Test {result.success ? 'Passed' : 'Failed'}
      </AlertTitle>
      <AlertDescription
        className={
          result.success
            ? 'text-green-700 dark:text-green-400'
            : 'text-red-700 dark:text-red-400'
        }
      >
        <div className="space-y-2">
          <p>{result.message}</p>
          {result.data?.connectionStatusUpdated && (
            <div className="rounded border border-orange-200 bg-orange-50 p-2 text-sm font-medium text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
              ⚠️ Connection status updated: Marked as disconnected due to
              authentication failure
            </div>
          )}
          {result.details && (
            <div className="text-sm opacity-90">
              <p className="mb-1 font-medium">Details:</p>
              <div className="rounded border bg-black/5 p-2 font-mono text-xs dark:bg-white/5">
                {result.details}
              </div>
            </div>
          )}
          {result.success && result.data && (
            <div className="mt-2 space-y-1 rounded border bg-white/50 p-2 text-xs opacity-80 dark:bg-black/20">
              <div>
                <strong>Connected Account:</strong> {result.data.connectedEmail}
              </div>
              <div>
                <strong>Primary Calendar:</strong>{' '}
                {result.data.primaryCalendarName}
              </div>
              <div>
                <strong>Time Zone:</strong>{' '}
                {result.data.primaryCalendarTimeZone}
              </div>
              <div>
                <strong>Accessible Calendars:</strong>{' '}
                {result.data.calendarCount}
              </div>
              <div>
                <strong>Last Tested:</strong>{' '}
                {result.data.lastTestedAt
                  ? new Date(result.data.lastTestedAt).toLocaleString()
                  : 'N/A'}
              </div>
            </div>
          )}
          {!result.success && result.data?.rawResponse && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer font-medium opacity-80 hover:opacity-100">
                Show Raw Server Response
              </summary>
              <div className="mt-1 max-h-40 overflow-auto rounded border bg-black/10 p-2 font-mono text-xs dark:bg-white/10">
                {result.data.rawResponse}
              </div>
            </details>
          )}
          {!result.success && result.data?.debugInfo != null && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer font-medium opacity-80 hover:opacity-100">
                Show Debug Information
              </summary>
              <div className="mt-1 max-h-40 overflow-auto rounded border bg-black/10 p-2 font-mono text-xs dark:bg-white/10">
                <pre>{JSON.stringify(result.data.debugInfo, null, 2)}</pre>
              </div>
            </details>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
