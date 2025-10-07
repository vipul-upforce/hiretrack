"use client";

import Link from "next/link";
import { useState } from "react";
import { Home, ChevronRight } from "lucide-react";
import withAuthGuard from "@/components/withAuthGuard";
import { Card, CardHeader } from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";
import { NginxLogs } from "../components/nginx-logs";
import { ServerHistoryLogs } from "../components/server-history-logs";
import { EmailHistory } from "../components/email-history";

function SystemLogsPage() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<"nginx" | "server" | "emails">(
    "nginx"
  );
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="h-screen flex flex-col overflow-hidden w-full">
      {/* Breadcrumbs */}
      <div className="flex-shrink-0 px-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-y-2 py-3 px-0">
            <div className="flex flex-col gap-2">
              <nav className="flex items-center text-sm text-muted-foreground font-medium">
                <Link
                  href="/dashboard"
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
                <ChevronRight className="h-4 w-4 mx-2" />
                <Link
                  href="/dashboard/settings"
                  className="hover:text-foreground transition-colors"
                >
                  Settings
                </Link>
                <ChevronRight className="h-4 w-4 mx-2" />
                <span className="text-foreground font-semibold">
                  System Logs
                </span>
              </nav>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="flex-1 min-h-0 px-4 pb-4 mt-4 overflow-y-auto">
        <div className="bg-card rounded-lg p-6 h-full flex flex-col font-sans">
          {/* Tabs */}
          <div className="flex border-b mb-6 flex-shrink-0 justify-between">
            <div className="flex space-x-2">
              <button
                className={`py-2 px-4 text-sm font-medium rounded-t-md transition-colors${
                  activeTab === "nginx"
                    ? " border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                    : " text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                disabled={activeTab === "nginx"}
                onClick={() => {
                  setActiveTab("nginx");
                  setSearchQuery("");
                  setError(null);
                }}
                aria-selected={activeTab === "nginx"}
              >
                Nginx Logs
              </button>
              <button
                className={`py-2 px-4 text-sm font-medium rounded-t-md transition-colors${
                  activeTab === "server"
                    ? " border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                    : " text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                disabled={activeTab === "server"}
                onClick={() => {
                  setActiveTab("server");
                  setSearchQuery("");
                  setError(null);
                }}
                aria-selected={activeTab === "server"}
              >
                History Logs
              </button>
              <button
                className={`py-2 px-4 text-sm font-medium rounded-t-md transition-colors${
                  activeTab === "emails"
                    ? " border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                    : " text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                disabled={activeTab === "emails"}
                onClick={() => {
                  setActiveTab("emails");
                  setSearchQuery("");
                  setError(null);
                }}
                aria-selected={activeTab === "emails"}
              >
                Email History
              </button>
            </div>
            {error && (
              <div className="text-red-500 px-4 flex items-center text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {activeTab === "nginx" && (
              <NginxLogs
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onError={setError}
              />
            )}
            {activeTab === "server" && (
              <ServerHistoryLogs
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onError={setError}
              />
            )}
            {activeTab === "emails" && (
              <div className="flex-1 flex flex-col min-h-0">
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
  requiredRoles: ["admin"],
  fallbackPath: "/dashboard",
  checkAllowance: false,
  allowAuthenticated: true,
});
