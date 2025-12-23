'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Home, ChevronRight } from 'lucide-react';
import withAuthGuard from '@/components/withAuthGuard';
import { Card, CardHeader } from '@/components/ui/card';
import { SystemLogViewer } from './system-logs/system-log-viewer';
import { ServerHistoryLogs } from './server/server-history-logs';
import { EmailHistory } from './email/email-history';

function SystemLogsPage() {
  const [activeTab, setActiveTab] = useState<
    'nginx' | 'pm2' | 'server' | 'emails'
  >('nginx');
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setError(null);
  };

  const getTabClass = (tab: typeof activeTab) =>
    `py-2 px-4 text-sm font-medium rounded-t-md transition-colors${
      activeTab === tab
        ? ' border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
        : ' text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Breadcrumbs */}
      <div className="flex-shrink-0 border-b border-gray-200 px-4 pb-2 dark:border-gray-700">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="flex flex-col gap-y-2 px-0 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <nav className="flex items-center text-sm font-medium text-muted-foreground">
                <Link
                  href="/dashboard"
                  className="flex items-center transition-colors hover:text-foreground"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
                <ChevronRight className="mx-2 h-4 w-4" />
                <Link
                  href="/dashboard/settings"
                  className="transition-colors hover:text-foreground"
                >
                  Settings
                </Link>
                <ChevronRight className="mx-2 h-4 w-4" />
                <span className="font-semibold text-foreground">
                  System Logs
                </span>
              </nav>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex h-full flex-col rounded-lg bg-card p-6 font-sans">
          {/* Tabs */}
          <div className="mb-6 flex flex-shrink-0 justify-between border-b">
            <div className="flex space-x-2">
              <button
                type="button"
                className={getTabClass('nginx')}
                disabled={activeTab === 'nginx'}
                onClick={() => handleTabChange('nginx')}
              >
                Nginx Logs
              </button>
              <button
                type="button"
                className={getTabClass('pm2')}
                disabled={activeTab === 'pm2'}
                onClick={() => handleTabChange('pm2')}
              >
                PM2 Logs
              </button>
              <button
                type="button"
                className={getTabClass('server')}
                disabled={activeTab === 'server'}
                onClick={() => handleTabChange('server')}
              >
                History Logs
              </button>
              <button
                type="button"
                className={getTabClass('emails')}
                disabled={activeTab === 'emails'}
                onClick={() => handleTabChange('emails')}
              >
                Email History
              </button>
            </div>
            {error && (
              <div className="flex items-center px-4 text-sm text-red-500">
                {error}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex min-h-0 flex-1 flex-col">
            {activeTab === 'nginx' && (
              <SystemLogViewer
                logType="nginx"
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onError={setError}
              />
            )}
            {activeTab === 'pm2' && (
              <SystemLogViewer
                logType="pm2"
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onError={setError}
              />
            )}
            {activeTab === 'server' && (
              <ServerHistoryLogs
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onError={setError}
              />
            )}
            {activeTab === 'emails' && (
              <div className="flex min-h-0 flex-1 flex-col">
                <EmailHistory />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuthGuard(SystemLogsPage, {
  requiredRoles: ['admin'],
  fallbackPath: '/dashboard',
  checkAllowance: false,
  allowAuthenticated: true,
});
