import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExternalLink, Info } from 'lucide-react';

export function SetupInstructions() {
  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>Setup Instructions</AlertTitle>
      <AlertDescription className="space-y-2 mt-2">
        <p>To enable Zoom scheduling with Server-to-Server OAuth:</p>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>
            Go to{' '}
            <a
              href="https://marketplace.zoom.us"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-500 hover:underline"
            >
              Zoom App Marketplace
              <ExternalLink className="h-3 w-3" />
            </a>
          </li>
          <li>Navigate to Develop &rarr; Build App</li>
          <li>Select <strong>Server-to-Server OAuth</strong> and create the app</li>
          <li>Open the <strong>App Credentials</strong> tab</li>
          <li>Copy the <strong>Account ID</strong>, <strong>Client ID</strong>, and <strong>Client Secret</strong></li>
          <li>
            Add these scopes under the <strong>Scopes</strong> tab:
            {' '}
            <strong>meeting:write:admin</strong>,{' '}
            <strong>meeting:read:admin</strong>,{' '}
            <strong>user:read:admin</strong>
          </li>
          <li>Activate the app, then save credentials here</li>
          <li>Click <strong>Test Connection</strong> to verify</li>
        </ol>
        <div className="mt-3 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm space-y-2 dark:border-amber-800/50 dark:bg-amber-900/20">
          <div>
            <strong className="dark:text-amber-200">Critical Requirements:</strong>
          </div>
          <ul className="list-disc list-inside space-y-1 ml-2 dark:text-amber-300">
            <li>Use a <strong>Server-to-Server OAuth</strong> app type (not OAuth)</li>
            <li>Ensure your Zoom account has permission to create apps</li>
            <li>
              Required scopes:
              {' '}
              <strong>meeting:write:admin</strong>,{' '}
              <strong>meeting:read:admin</strong>,{' '}
              <strong>user:read:admin</strong>
            </li>
            <li>Activate the app before testing</li>
          </ul>
          <div className="text-red-600 font-medium">
            If connection fails, double-check scopes and that the app is active.
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
