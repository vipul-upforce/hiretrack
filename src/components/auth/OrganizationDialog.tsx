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
// import { LoginFormValues } from "@/app/auth/login/page";
import { LoginFormValues } from "@/types/login";

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
      <DialogContent size="md" className="p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4">
          <DialogTitle>Select an Organization</DialogTitle>
          <DialogDescription>
            You have accounts in multiple organizations, please continue with
            any one.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
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
                  onClick={() => setSelectedOrgIdLocal(org.orgId)}
                  className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer 
                              hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors 
                              ${selectedOrgId === org.orgId ? "border-primary" : ""}`}
                >
                  <RadioGroupItem
                    value={org.orgId}
                    id={org.orgId}
                    disabled={loadingOrg === org.orgId}
                    className="pointer-events-none"
                  />
                  <div className="flex flex-col">
                    <Label
                      htmlFor={org.orgId}
                      className="font-medium cursor-pointer"
                    >
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
          <div className="flex justify-end space-x-2 border-t bg-background px-6 py-4 sticky bottom-0 z-10">
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
