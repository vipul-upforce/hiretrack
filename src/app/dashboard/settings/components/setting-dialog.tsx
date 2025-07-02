"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
import SMTPConfigs from "./smtp-configs-dialog";
import FileStorageOptions from "./fileStorage-dialog";
import PortalConfigs from "./portalConfig-dialog";
import GeminiConfigs from "./gemini";
import MultipleOrgsConfigs from "./MultipleOrgsConfigs";
import BackupsDialog from "./backups-dialog";
import AssetsDialog from "./assets-dialog";
import TimeZoneSelect from "./TimeZone-Dialog";
import EmailTemplateEditor from "./edit-mail-dialog";
import LogsDialog from "./LogsDialog";
// import FileStorageOptions from "./file-storage-dialog"; // Example for another setting

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
  portal: PortalConfigs,
  gemini: GeminiConfigs,
  multipleorgs: MultipleOrgsConfigs,
  backups: BackupsDialog,
  assets: AssetsDialog,
  timezone: TimeZoneSelect,
  templates: EmailTemplateEditor,
  logs: LogsDialog,
};

const SettingDialog = ({
  isOpen,
  onClose,
  setting,
}: {
  isOpen: boolean;
  onClose: () => void;
  setting: { title: string; description: string; key: string };
}) => {
  const ComponentToRender = settingComponents[setting.key];
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${
          setting.title === "Portal" ||
          setting.title === "Email Template" ||
          setting.key === "logs"
            ? "max-w-7xl w-[90vw] min-h-[95vh] flex flex-col p-4"
            : ""
        }`}
      >
        <DialogHeader>
          <DialogTitle>{setting.title}</DialogTitle>
          <DialogDescription>{setting.description}</DialogDescription>
        </DialogHeader>

        {ComponentToRender ? (
          <ComponentToRender onClose={onClose} isOpen={isOpen} />
        ) : (
          <p> No settings available for this option.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SettingDialog;
