"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SettingDialog from "./components/setting-dialog";
import AddCustomFieldButton from "@/Custom_Fields/Components/AddCustomFieldButton";
import withAuthGuard from "@/components/withAuthGuard";
import {
  Database,
  Mail,
  Globe,
  Bot,
  Building2,
  HardDrive,
  Download,
  Clock,
  FileText,
  Activity,
  Tags,
  Shield,
  Settings as SettingsIcon,
  Users,
  Lock,
  MessageSquare,
  Palette,
  Zap,
  Server,
  Key,
  Bell,
  Archive,
  Monitor,
  FolderOpen,
  UserCheck,
  Cog,
  Sparkles,
} from "lucide-react";

function Settings() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const router = useRouter();

  const settingGroups = [
    {
      title: "Organization Settings",
      description: "Core organization configuration and branding",
      icon: Building2,
      settings: [
        {
          title: "Portal Configuration",
          key: "portal",
          description: "Customize portal appearance and branding",
          icon: Globe,
        },
        {
          title: "Time Zone",
          key: "timezone",
          description: "Set organization's default timezone",
          icon: Clock,
        },
        {
          title: "Multiple Organizations",
          key: "multipleorgs",
          description: "Configure multi-tenant organization settings",
          icon: Building2,
        },
        {
          title: "Storage Settings",
          key: "fs",
          description: "Manage file storage and disk space allocation",
          icon: HardDrive,
        },
      ],
    },
    {
      title: "Security & Access",
      description: "User management and security settings",
      icon: Shield,
      settings: [
        {
          title: "User Management",
          key: "users",
          description: "Manage user accounts and permissions",
          icon: UserCheck,
        },
        {
          title: "Two Factor Authentication",
          key: "twoFA",
          description: "Enable 2FA for enhanced account security",
          icon: Lock,
        },
      ],
    },
    {
      title: "Communication",
      description: "Email and notification configuration",
      icon: MessageSquare,
      settings: [
        {
          title: "Email Configuration",
          key: "mail",
          description: "Configure SMTP settings for email delivery",
          icon: Mail,
        },
        {
          title: "Email Templates",
          key: "templates",
          description: "Customize email notification templates",
          icon: FileText,
        },
        {
          title: "AI Integration",
          key: "gemini",
          description: "Configure AI assistant and automation",
          icon: Sparkles,
        },
      ],
    },
    {
      title: "Data & System",
      description: "Backup, logs, and system management",
      icon: Database,
      settings: [
        {
          title: "Database Backups",
          key: "backups",
          description: "Schedule and manage data backups",
          icon: Archive,
        },
        {
          title: "System Logs",
          key: "logs",
          description: "View system activity and audit logs",
          icon: Activity,
        },
        {
          title: "Media Assets",
          key: "assets",
          description: "Download and manage server media files",
          icon: Download,
        },
      ],
    },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden w-full">
      {/* Header section with improved design */}
      <div className="flex-shrink-0 px-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-y-2 py-3 px-0">
            {/* Title */}
            <CardTitle className="line-clamp-2 md:mr-2 text-xl font-bold">
              Settings
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex-1 min-h-0 px-4 pb-4 mt-4 space-y-8 overflow-y-auto">

      {settingGroups.map((group) => (
        <div key={group.title} className="space-y-4">
          {/* Group Header */}
          <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <group.icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {group.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {group.description}
              </p>
            </div>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {group.settings.map((option) => (
              <div key={option.key}>
                <Card
                  className="h-full transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg bg-white dark:bg-black"
                  onClick={() => {
                    if (option.key === "users") {
                      router.push("/dashboard/users");
                    } else if (option.key === "portal") {
                      router.push("/dashboard/settings/portal");
                    } else if (option.key === "templates") {
                      router.push("/dashboard/settings/templates");
                    } else if (option.key === "logs") {
                      router.push("/dashboard/settings/logs");
                    } else {
                      setOpenDialog(option.key);
                    }
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                        <option.icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100">
                          {option.title}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {option.description}
                    </p>
                  </CardContent>
                </Card>

                {/* Dialog Component */}
                {openDialog === option.key && option.key !== "portal" && option.key !== "templates" && option.key !== "logs" && (
                  <SettingDialog
                    isOpen={openDialog === option.key}
                    onClose={() => setOpenDialog(null)}
                    setting={option}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Custom Fields Section */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 pb-2">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
            <Palette className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Custom Fields
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create and manage custom form fields for candidates
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AddCustomFieldButton />
          <Card
            className="h-full transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg bg-white dark:bg-black"
            onClick={() => setOpenDialog("tags")}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                  <Tags className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100">
                    Candidate Tags
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Organize candidates with custom tags
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Dialog Component for Tags */}
        {openDialog === "tags" && (
          <SettingDialog
            isOpen={openDialog === "tags"}
            onClose={() => setOpenDialog(null)}
            setting={{
              title: "Candidate Tags",
              key: "tags",
              description: "Organize candidates with custom tags",
            }}
          />
        )}
      </div>
      </div>
    </div>
  );
}

export default withAuthGuard(Settings, {
  requiredRoles: ["admin"],
  fallbackPath: "/dashboard",
  checkAllowance: false,
  allowAuthenticated: true,
});
