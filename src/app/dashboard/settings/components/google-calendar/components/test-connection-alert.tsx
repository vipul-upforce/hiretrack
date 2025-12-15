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
        Connection Test
        {' '}
        {result.success ? 'Passed' : 'Failed'}
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
            <div className="text-sm font-medium text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 p-2 rounded border border-orange-200 dark:border-orange-800">
              ⚠️ Connection status updated: Marked as disconnected due to
              authentication failure
            </div>
          )}
          {result.details && (
            <div className="text-sm opacity-90">
              <p className="font-medium mb-1">Details:</p>
              <div className="font-mono text-xs bg-black/5 dark:bg-white/5 p-2 rounded border">
                {result.details}
              </div>
            </div>
          )}
          {result.success && result.data && (
            <div className="text-xs opacity-80 space-y-1 mt-2 p-2 bg-white/50 dark:bg-black/20 rounded border">
              <div>
                <strong>Connected Account:</strong>
                {' '}
                {result.data.connectedEmail}
              </div>
              <div>
                <strong>Primary Calendar:</strong>
                {' '}
                {result.data.primaryCalendarName}
              </div>
              <div>
                <strong>Time Zone:</strong>
                {' '}
                {result.data.primaryCalendarTimeZone}
              </div>
              <div>
                <strong>Accessible Calendars:</strong>
                {' '}
                {result.data.calendarCount}
              </div>
              <div>
                <strong>Last Tested:</strong>
                {' '}
                {result.data.lastTestedAt
                  ? new Date(result.data.lastTestedAt).toLocaleString()
                  : 'N/A'}
              </div>
            </div>
          )}
          {!result.success && result.data?.rawResponse && (
            <details className="text-xs mt-2">
              <summary className="cursor-pointer font-medium opacity-80 hover:opacity-100">
                Show Raw Server Response
              </summary>
              <div className="mt-1 font-mono text-xs bg-black/10 dark:bg-white/10 p-2 rounded border max-h-40 overflow-auto">
                {result.data.rawResponse}
              </div>
            </details>
          )}
          {!result.success && result.data?.debugInfo && (
            <details className="text-xs mt-2">
              <summary className="cursor-pointer font-medium opacity-80 hover:opacity-100">
                Show Debug Information
              </summary>
              <div className="mt-1 font-mono text-xs bg-black/10 dark:bg-white/10 p-2 rounded border max-h-40 overflow-auto">
                <pre>{JSON.stringify(result.data.debugInfo, null, 2)}</pre>
              </div>
            </details>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
