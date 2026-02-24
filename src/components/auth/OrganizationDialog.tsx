import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@radix-ui/react-label';
import { LoginFormValues } from '@/types/login';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
// import { LoginFormValues } from "@/app/auth/login/page";

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

function OrganizationDialog({
  isOpen,
  onClose,
  data,
  setSelectedOrgId,
}: OrganizationDialogProps) {
  const [loadingOrg, setLoadingOrg] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgIdLocal] = useState<string>('');

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
      <DialogContent size="md" className="flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 py-4">
          <DialogTitle>Select an Organization</DialogTitle>
          <DialogDescription>
            You have accounts in multiple organizations, please continue with
            any one.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <Label>Select your organization</Label>
          <hr />
          <div className="max-h-[40vh] space-y-2 overflow-y-auto">
            <RadioGroup
              value={selectedOrgId}
              onValueChange={(value) => setSelectedOrgIdLocal(value)}
              className="max-h-[50vh] space-y-2"
            >
              {data.organizations.map((org) => (
                <div
                  key={org.orgId}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selectedOrgId === org.orgId}
                  onClick={() => setSelectedOrgIdLocal(org.orgId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedOrgIdLocal(org.orgId);
                    }
                  }}
                  className={`flex cursor-pointer items-center space-x-3 rounded-md border p-3 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:hover:bg-gray-900 ${selectedOrgId === org.orgId ? 'border-primary' : ''}`}
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
                      className="cursor-pointer font-medium"
                    >
                      {org.name}
                    </Label>
                    <span className="text-xs text-gray-500">
                      {org.isCandidate ? 'Candidate Account' : 'User Account'}
                    </span>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
          <hr />
          <div className="sticky bottom-0 z-10 flex justify-end space-x-2 border-t bg-background px-6 py-4">
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
              variant="primary"
              onClick={handleContinue}
              disabled={!!loadingOrg || !selectedOrgId}
            >
              {loadingOrg ? 'Selecting...' : 'Continue'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default OrganizationDialog;
