"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import GeminiConfigs from "./gemini";
import AssetsDialog from "./assets-dialog";
import EmailTemplateEditor from "./edit-mail-dialog";
import LogsDialog from "./LogsDialog";
import ManageTagsDialog from "../../jobs/[id]/components/Dialogs/manage-tags-dialog";
import GoogleCalendarSettings from "./google-calendar";
import { useSelector } from "react-redux";
import { User } from "@/lib/features/org/orgApi";
import BackupsDialog from "./backups";
import { EvaluationSettings } from "./ai-evaluation-settings";
import AIProvidersConfigs from "./ai-providers";
import SMTPConfigs from "./mail-config";
import AboutDialog from "./about-version";
import FileStorageOptions from "./file-storage";
import twoFASettings from "./two-fa";
import MultipleOrgsConfigs from "./multiple-org";
import TimeZoneSelect from "./time-zone";
import CaptchaSettings from "./captcha";
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
  "ai-providers": AIProvidersConfigs,
  "google-calendar": GoogleCalendarSettings,
  multipleorgs: MultipleOrgsConfigs,
  backups: BackupsDialog,
  assets: AssetsDialog,
  timezone: TimeZoneSelect,
  templates: EmailTemplateEditor,
  logs: LogsDialog,
  tags: ManageTagsDialog,
  twoFA: twoFASettings,
  captcha: CaptchaSettings,
  version: AboutDialog,
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
  const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {}
  );
  const orgId = user.organizationId;

  if (setting.key === "tags")
    return <ManageTagsDialog onClose={onClose} isOpen={isOpen} orgId={orgId} />;

  if (setting.key === "evaluation")
    return <EvaluationSettings onClose={onClose} isOpen={isOpen} />;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        size={
          setting.key === "ai-providers" || setting.key === "google-calendar"
            ? "2xl"
            : setting.key === "version"
              ? "xl"
              : setting.key === "backups"
                ? "lg"
                : undefined
        }
        className={`${
          setting.key === "portal" ||
          setting.key === "templates" ||
          setting.key === "logs"
            ? "max-w-7xl w-[90vw] min-h-[95vh] overflow-hidden flex flex-col"
            : setting.key === "ai-providers"
              ? "max-h-[90vh] p-0 overflow-hidden flex flex-col"
              : setting.key === "google-calendar"
                ? "max-h-[90vh] p-0 overflow-hidden flex flex-col"
                : setting.key === "timezone"
                  ? "max-w-2xl w-[90vw] overflow-visible"
                  : setting.key === "version"
                    ? "max-h-[90vh] w-[100vw] p-0 overflow-hidden flex flex-col"
                    : setting.key === "mail"
                      ? "max-h-[90vh] w-[60vw] p-0 hide-scrollbar overflow-y-auto flex flex-col"
                      : "overflow-hidden"
        }`}
      >
        <DialogHeader className="px-6 py-4 pr-12">
          <DialogTitle>{setting.title}</DialogTitle>
          <DialogDescription>{setting.description}</DialogDescription>
        </DialogHeader>

        {ComponentToRender && setting.key !== "tags" ? (
          setting.key === "timezone" ||
          setting.key === "fs" ||
          setting.key === "mail" ||
          setting.key === "multipleorgs" ||
          setting.key === "gemini" ||
          setting.key === "captcha" ||
          setting.key === "twoFA" ? (
            <ComponentToRender onClose={onClose} isOpen={isOpen} />
          ) : setting.key === "ai-providers" ||
            setting.key === "google-calendar" ? (
            <div className="flex-1 overflow-hidden px-6 py-0 overflow-y-auto ">
              <ComponentToRender onClose={onClose} isOpen={isOpen} />
            </div>
          ) : setting.key === "version" ? (
            <div className="flex-1 overflow-hidden py-0 overflow-y-auto">
              <ComponentToRender onClose={onClose} isOpen={isOpen} />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <ComponentToRender onClose={onClose} isOpen={isOpen} />
            </div>
          )
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
