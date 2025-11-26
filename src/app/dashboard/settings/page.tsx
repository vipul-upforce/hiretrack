"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SettingDialog from "./components/setting-dialog";
import AddCustomFieldButton from "@/Custom_Fields/Components/AddCustomFieldButton";
import withAuthGuard from "@/components/withAuthGuard";
import { Tags, Palette } from "lucide-react";
import { settingGroups } from "./constants";
import SettingsCard from "./components/settings/setting-card";

function Settings() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const config = searchParams.get("config");
    if (config) {
      setOpenDialog(config);
    }
  }, [searchParams]);

  // Helper function to check if setting opens in new page
  const opensInNewPage = (key: string) => {
    return ["users", "portal", "templates", "logs"].includes(key);
  };

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
          <SettingsCard
            group={group}
            openDialog={openDialog}
            opensInNewPage={opensInNewPage}
            setOpenDialog={setOpenDialog}
            key={group.title}
          />
        ))}

        {/* Custom Fields Section */}
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 pb-2">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-black">
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
              className="h-full transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-800 hover:shadow-lg bg-white dark:bg-black card-hover-border"
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
