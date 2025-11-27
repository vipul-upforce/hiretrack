"use client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";
import SettingDialog from "../setting-dialog";
import { ExternalLink } from "lucide-react";
import { SettingGroup } from "../../types";

interface SettingsCardProps {
  group: SettingGroup;
  setOpenDialog: React.Dispatch<React.SetStateAction<string | null>>;
  opensInNewPage: (key: string) => boolean;
  openDialog: string | null;
}

const SettingsCard = ({
  group,
  setOpenDialog,
  opensInNewPage,
  openDialog,
}: SettingsCardProps) => {
  const router = useRouter();
  return (
    <div key={group.title} className="space-y-4">
      {/* Group Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-black">
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
              className="h-full transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-800 hover:shadow-lg bg-white dark:bg-black card-hover-border"
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
              <CardHeader className="pb-3 relative">
                <div className="flex gap-3 items-center">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                    <option.icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100">
                      {option.title}
                    </CardTitle>
                  </div>
                  {opensInNewPage(option.key) && (
                    <div className="absolute top-4 right-4">
                      <ExternalLink className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 opacity-60" />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {option.description}
                </p>
              </CardContent>
            </Card>

            {/* Dialog Component */}
            {openDialog === option.key &&
              option.key !== "portal" &&
              option.key !== "templates" &&
              option.key !== "logs" && (
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
  );
};

export default SettingsCard;
