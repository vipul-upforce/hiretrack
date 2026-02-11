import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExternalLink, Info } from 'lucide-react';

export function SetupInstructions() {
  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>Setup Instructions</AlertTitle>
      <AlertDescription className="space-y-2 mt-2">
        <p>To enable Microsoft Teams scheduling with Microsoft Graph API:</p>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>
            Go to{' '}
            <a
              href="https://portal.azure.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-500 hover:underline"
            >
              Azure Portal
              <ExternalLink className="h-3 w-3" />
            </a>
          </li>
          <li>Navigate to <strong>Azure Active Directory</strong> &rarr; <strong>App registrations</strong></li>
          <li>Click <strong>New registration</strong> to create a new app</li>
          <li>Enter a name for your app and select your account type</li>
          <li>After registration, go to <strong>Certificates & secrets</strong></li>
          <li>Create a new <strong>Client secret</strong> and copy the value</li>
          <li>
            Go to <strong>Authentication</strong> and add the redirect URI shown below
          </li>
          <li>
            Go to <strong>API permissions</strong> and add the following Microsoft Graph API permissions:
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li><strong>Calendars.ReadWrite</strong> (Delegated permission - for Calendar sync)</li>
              <li><strong>User.Read</strong> (Delegated permission - to get user email)</li>
              <li><strong>OnlineMeetings.ReadWrite</strong> (Delegated permission - for Teams meetings with user context)</li>
              <li><strong>OnlineMeetings.ReadWrite.All</strong> (Application permission - for Teams meetings without user context, requires application access policy)</li>
            </ul>
          </li>
          <li>
            <strong>CRITICAL STEP:</strong> Click <strong>Grant admin consent</strong> for your organization
            (This must be done by a Global Administrator or an admin with permission to grant consent).
            <strong className="text-red-600"> Without this step, users will see &quot;Need admin approval&quot; error.</strong>
          </li>
          <li>Copy the <strong>Application (client) ID</strong> and <strong>Directory (tenant) ID</strong></li>
          <li>Enter the credentials below and click <strong>Save Credentials</strong></li>
          <li>Click <strong>Connect Microsoft Calendar</strong> to authorize calendar access</li>
          <li>
            <strong>After admin consent is granted:</strong> Regular users can connect without seeing admin approval prompts.
            If you still see &quot;Need admin approval&quot;, verify admin consent was granted in Azure Portal.
          </li>
          <li>Click <strong>Test Connection</strong> to verify</li>
        </ol>
        <div className="mt-3 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm space-y-2 dark:border-amber-800/50 dark:bg-amber-900/20">
          <div>
            <strong className="dark:text-amber-200">Critical Requirements:</strong>
          </div>
          <ul className="list-disc list-inside space-y-1 ml-2 dark:text-amber-300">
            <li>Use <strong>Delegated permissions</strong> for Calendar integration (Calendars.ReadWrite, User.Read)</li>
            <li>Use <strong>Application permissions</strong> for Teams meetings (OnlineMeetings.ReadWrite)</li>
            <li>Ensure you have admin rights to grant permissions</li>
            <li>
              Required delegated permissions:
              {' '}
              <strong>Calendars.ReadWrite</strong>, <strong>User.Read</strong>
            </li>
            <li>
              Required application permissions:
              {' '}
              <strong>OnlineMeetings.ReadWrite</strong>
            </li>
            <li>Grant admin consent after adding permissions</li>
            <li>Add the redirect URI to Authentication settings before connecting</li>
          </ul>
          <div className="text-red-600 font-medium dark:text-red-400">
            <strong>Important:</strong> If you see &quot;Need admin approval&quot; error even after admin granted permissions:
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>Verify admin consent was granted in Azure Portal: <strong>API permissions → Grant admin consent</strong></li>
              <li>Check that the admin used the correct app registration (verify Client ID matches)</li>
              <li>Ensure the app registration is in the same tenant as your account</li>
              <li>Wait a few minutes after admin consent is granted for changes to propagate</li>
              <li>Try disconnecting and reconnecting after admin consent is granted</li>
            </ul>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
