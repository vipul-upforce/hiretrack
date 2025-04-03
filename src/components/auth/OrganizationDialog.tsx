import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoginFormValues } from "@/app/auth/login/page";

export interface Organization {
    orgId: string;
    name: string;
    description: string;
}
interface OrganizationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    data: LoginFormValues & { organizations: Organization[] };
    setSelectedOrgId: (orgId: string) => void; 
}

const OrganizationDialog: React.FC<OrganizationDialogProps> = ({ isOpen, onClose, data, setSelectedOrgId }) => {
    const [loadingOrg, setLoadingOrg] = useState<string | null>(null);
    
    const handleContinue = (orgId: string) => {
        // debugger
        setLoadingOrg(orgId);
        setSelectedOrgId(orgId);
       
        onClose();
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[80vw] xl:max-w-[50vw] p-6">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">Select an Organization</DialogTitle>
                    <p>You have accounts in multiple organizations, please continue with any one.</p>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto">
                    {data.organizations.map((org) => (
                        <Card key={org.orgId} className="hover:shadow-lg transition-shadow flex flex-row items-center justify-between pr-4 ">
                            <CardHeader className="w-[70%]">
                                <CardTitle className="w-[100%] truncate">{org.name}</CardTitle>
                            </CardHeader>
                            <Button
                                onClick={() => handleContinue(org.orgId)}
                                disabled={loadingOrg === org.orgId}
                            >
                                {loadingOrg === org.orgId ? "Selecting..." : "Continue"}
                            </Button>
                        </Card>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default OrganizationDialog;