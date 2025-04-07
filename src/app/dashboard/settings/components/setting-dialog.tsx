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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{setting.title}</DialogTitle>
          <DialogDescription>{setting.description}</DialogDescription>
        </DialogHeader>

        {ComponentToRender ? (
          <ComponentToRender onClose={onClose} />
        ) : (
          <p> No settings available for this option.</p>
        )}

        {/* <DialogClose asChild>
          <Button onClick={onClose}>Close</Button>
        </DialogClose> */}
      </DialogContent>
    </Dialog>
  );
};

export default SettingDialog;
