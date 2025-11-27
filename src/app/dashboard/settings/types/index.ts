import { LucideIcon } from "lucide-react";

export interface SettingOption {
  title: string;
  key: string;
  description: string;
  icon: LucideIcon;
}

export interface SettingGroup {
  title: string;
  description: string;
  icon: LucideIcon;
  settings: SettingOption[];
}
