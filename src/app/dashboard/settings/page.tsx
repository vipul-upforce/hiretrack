"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SettingDialog from "./components/setting-dialog";

export default function Settings() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);

  const settings = [
    {
      title: "Storage Settings",
      key: "fs",
      description: "Configure your organization's storage settings.",
    },
    {
      title: "SMTP Configs",
      key: "smtp",
      description: "Configure the SMTP configurations for your organization.",
    },
    {
      title: "Portal",
      key: "portal",
      description: "Update the Portal configurations of your organization.",
    },
  ];

  return (
    <div className="space-y-4 flex flex-row items-baseline">
      {settings.map((option) => (
        <div key={option.key}>
          <Card
            className="hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer mr-4"
            onClick={() => setOpenDialog(option.key)}
          >
            <CardHeader>
              <CardTitle>{option.title}</CardTitle>
            </CardHeader>
            <CardContent>{option.description}</CardContent>
          </Card>

          {/* Dialog Component */}
          {openDialog === option.key && (
            <SettingDialog
              isOpen={openDialog === option.key}
              onClose={() => setOpenDialog(null)}
              setting={option}
            />
          )}
        </div>
      ))}
    </div>
  );
}
