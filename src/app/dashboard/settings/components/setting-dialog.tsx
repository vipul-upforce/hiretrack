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
// import FileStorageOptions from "./file-storage-dialog"; // Example for another setting

interface SettingComponentProps {
  onClose: () => void;
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
          setting.title === "Portal"
            ? "max-w-7xl w-[90vw] h-[95vh] flex flex-col p-4"
            : ""
        }`}
      >
        <DialogHeader>
          <DialogTitle>{setting.title}</DialogTitle>
          <DialogDescription>{setting.description}</DialogDescription>
        </DialogHeader>

        {ComponentToRender ? (
          <ComponentToRender onClose={onClose} />
        ) : (
          <p> No settings available for this option.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SettingDialog;
