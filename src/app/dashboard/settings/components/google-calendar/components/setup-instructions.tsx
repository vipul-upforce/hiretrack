import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExternalLink, Info } from 'lucide-react';

export function SetupInstructions() {
  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>Setup Instructions</AlertTitle>
      <AlertDescription className="space-y-2 mt-2">
        <p>To enable Google Calendar integration:</p>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>
            Go to
            {' '}
            <a
              href="https://console.cloud.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline inline-flex items-center gap-1"
            >
              Google Cloud Console
              {' '}
              <ExternalLink className="h-3 w-3" />
            </a>
          </li>
          <li>Create a new project or select existing one</li>
          <li>
            <strong>Enable Google Calendar API</strong>
            {' '}
            in API Library
          </li>
          <li>Go to Credentials → Create Credentials → OAuth 2.0 Client IDs</li>
          <li>Set Application Type to &quot;Web application&quot;</li>
          <li>
            <strong>Add the exact redirect URI shown below</strong>
          </li>
          <li>Copy Client ID and Client Secret here</li>
          <li>Save credentials and try connecting</li>
        </ol>
        <div className="mt-3 p-3 bg-yellow-50 dark:bg-amber-900/20 border border-yellow-200 dark:border-amber-800/50 rounded text-sm space-y-2">
          <div>
            <strong className="dark:text-amber-200 ">
              ⚠️ Critical Requirements:
            </strong>
          </div>
          <ul className="list-disc list-inside space-y-1 ml-2 dark:text-amber-300">
            <li>
              <strong>Enable Google Calendar API</strong>
              {' '}
              in API Library
            </li>
            <li>
              <strong>Set OAuth consent screen</strong>
              {' '}
              to External (unless
              internal org)
            </li>
            <li>
              <strong>Add test users</strong>
              {' '}
              if using external consent screen
            </li>
            <li>
              <strong>Copy redirect URI exactly</strong>
              {' '}
              (no extra
              spaces/characters)
            </li>
            <li>
              <strong>Ensure scopes include:</strong>
              {' '}
              Calendar, Calendar Events,
              Email
            </li>
          </ul>
          <div className="text-red-600 font-medium">
            💡 If you get &quot;missing authentication credential&quot; errors,
            it usually means the Calendar API is not enabled!
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
