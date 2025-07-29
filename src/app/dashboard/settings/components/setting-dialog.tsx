"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import SMTPConfigs from "./smtp-configs-dialog";
import FileStorageOptions from "./fileStorage-dialog";
import GeminiConfigs from "./gemini";
import MultipleOrgsConfigs from "./MultipleOrgsConfigs";
import BackupsDialog from "./backups-dialog";
import AssetsDialog from "./assets-dialog";
import TimeZoneSelect from "./TimeZone-Dialog";
import EmailTemplateEditor from "./edit-mail-dialog";
import LogsDialog from "./LogsDialog";
import ManageTagsDialog from "../../jobs/[id]/components/Dialogs/manage-tags-dialog";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import twoFASettings from "./twofa-setting";
export interface SettingComponentProps {
  onClose: () => void;
  isOpen?: boolean;
}

const settingComponents: Record<
  string,
  React.ComponentType<SettingComponentProps>
> = {
  mail: SMTPConfigs,
  fs: FileStorageOptions,
  gemini: GeminiConfigs,
  multipleorgs: MultipleOrgsConfigs,
  backups: BackupsDialog,
  assets: AssetsDialog,
  timezone: TimeZoneSelect,
  templates: EmailTemplateEditor,
  logs: LogsDialog,
  tags: ManageTagsDialog,
  twoFA: twoFASettings,
};

const SettingDialog = ({
  isOpen,
  onClose,
  setting,
}: {
  isOpen: boolean;
  onClose: () => void;
  setting: { title: string; description: string; key: string; orgId?: string };
}) => {
  const ComponentToRender = settingComponents[setting.key];
  const [orgId, setOrgId] = useState("");
  useEffect(() => {
    (async () => {
      const token = Cookies.get("token");
      if (token) {
        const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
        if (decryptedResponse.success && decryptedResponse.user) {
          setOrgId(decryptedResponse.user.organizationId);
        }
      }
    })();
  }, []);

  if (setting.key === "tags")
    return <ManageTagsDialog onClose={onClose} isOpen={isOpen} orgId={orgId} />;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`overflow-hidden flex flex-col ${
          setting.key === "portal" ||
          setting.key === "templates" ||
          setting.key === "logs"
            ? "max-w-7xl w-[90vw] min-h-[95vh]"
            : ""
        }`}
      >
        <DialogHeader className="px-6 py-4 pr-12">
          <DialogTitle>{setting.title}</DialogTitle>
          <DialogDescription>{setting.description}</DialogDescription>
        </DialogHeader>

        {ComponentToRender && setting.key !== "tags" ? (
          <ComponentToRender onClose={onClose} isOpen={isOpen} />
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <p>No settings available for this option.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SettingDialog;
