import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PortalSettings } from "../../types";
import { User } from "@/app/dashboard/jobs/[id]/schemas/AssignCandidateSchema";

interface GeneralTabProps {
  settings: PortalSettings;
  setSettings: React.Dispatch<React.SetStateAction<PortalSettings>>;
  user: User;
}

export function GeneralTab({ settings, setSettings, user }: GeneralTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Portal Information</CardTitle>
        <CardDescription>Basic settings for your portal</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="portalName">Portal Name</Label>
          <Input
            id="portalName"
            value={
              settings.portalName &&
              settings.portalName !== "" &&
              settings.portalName.length > 0
                ? settings.portalName
                : user?.organizationInfo?.name
            }
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                portalName: e.target.value,
              }))
            }
            placeholder="Enter your portal name"
          />
          <p className="text-xs text-muted-foreground">
            This name will appear in the browser title and portal header
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
