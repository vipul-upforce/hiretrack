import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@radix-ui/react-label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { LoginFormValues } from "@/app/auth/login/page";

export interface OneOfMulOrganization {
  orgId: string;
  name?: string;
  isCandidate?: boolean;
}
interface OrganizationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: LoginFormValues & { organizations: OneOfMulOrganization[] };
  setSelectedOrgId: (orgId: string) => void;
}

const OrganizationDialog: React.FC<OrganizationDialogProps> = ({
  isOpen,
  onClose,
  data,
  setSelectedOrgId,
}) => {
  const [loadingOrg, setLoadingOrg] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgIdLocal] = useState<string>("");

  const handleContinue = () => {
    // debugger;
    if (selectedOrgId) {
      setLoadingOrg(selectedOrgId);
      setSelectedOrgId(selectedOrgId);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select an Organization</DialogTitle>
          <DialogDescription>
            You have accounts in multiple organizations, please continue with
            any one.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Label>Select your organization</Label>
          <hr></hr>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            <RadioGroup
              value={selectedOrgId}
              onValueChange={(value) => setSelectedOrgIdLocal(value)}
              className="space-y-2 max-h-[50vh] overflow-y-auto"
            >
              {data.organizations.map((org) => (
                <div
                  key={org.orgId}
                  className="flex items-center space-x-3 p-3 border rounded-md hover:bg-gray-50 transition-colors"
                >
                  <RadioGroupItem
                    value={org.orgId}
                    id={org.orgId}
                    disabled={loadingOrg === org.orgId}
                  />
                  <div className="flex flex-col">
                    <Label htmlFor={org.orgId} className="font-medium">
                      {org.name}
                    </Label>
                    <span className="text-xs text-gray-500">
                      {org.isCandidate ? "Candidate Account" : "User Account"}
                    </span>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
          <hr />
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={!!loadingOrg}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleContinue}
              disabled={!!loadingOrg || !selectedOrgId}
            >
              {loadingOrg ? "Selecting..." : "Continue"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrganizationDialog;
