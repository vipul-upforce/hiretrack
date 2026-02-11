import {
  Database,
  Mail,
  Globe,
  Bot,
  Building2,
  HardDrive,
  Download,
  Clock,
  FileText,
  Activity,
  Shield,
  Lock,
  MessageSquare,
  Archive,
  UserCheck,
  Sparkles,
  Calendar,
  ShieldCheck,
  ArrowUpCircle,
  Video,
} from 'lucide-react';
import { SettingGroup } from './types';

export const settingGroups: SettingGroup[] = [
  {
    title: 'Organization Settings',
    description: 'Core organization configuration and branding',
    icon: Building2,
    settings: [
      {
        title: 'Portal Configuration',
        key: 'portal',
        description: 'Customize portal appearance and branding',
        icon: Globe,
      },
      {
        title: 'Time Zone',
        key: 'timezone',
        description: "Set organization's default timezone",
        icon: Clock,
      },
      {
        title: 'Multiple Organizations',
        key: 'multipleorgs',
        description: 'Configure multi-tenant organization settings',
        icon: Building2,
      },
      {
        title: 'Storage Settings',
        key: 'fs',
        description: 'Manage file storage and disk space allocation',
        icon: HardDrive,
      },
    ],
  },
  {
    title: 'Security & Access',
    description: 'User management and security settings',
    icon: Shield,
    settings: [
      {
        title: 'User Management',
        key: 'users',
        description: 'Manage user accounts and permissions',
        icon: UserCheck,
      },
      {
        title: 'Two Factor Authentication',
        key: 'twoFA',
        description: 'Enable 2FA for enhanced account security',
        icon: Lock,
      },
      {
        title: 'Captcha Verification',
        key: 'captcha',
        description: 'Configure captcha for the portal',
        icon: ShieldCheck,
      },
      {
        title: 'About',
        key: 'version',
        description: 'View application information and manage updates',
        icon: ArrowUpCircle,
      },
    ],
  },
  {
    title: 'Communication',
    description: 'Email and notification configuration',
    icon: MessageSquare,
    settings: [
      {
        title: 'Email Configuration',
        key: 'mail',
        description: 'Configure SMTP settings for email delivery',
        icon: Mail,
      },
      {
        title: 'Email Templates',
        key: 'templates',
        description: 'Customize email notification templates',
        icon: FileText,
      },
      {
        title: 'AI Providers',
        key: 'ai-providers',
        description: 'Configure AI providers for resume processing',
        icon: Bot,
      },
      {
        title: 'AI Evaluation Settings',
        key: 'evaluation',
        description: 'Configure AI candidate evaluation criteria and scoring',
        icon: Sparkles,
      },
      {
        title: 'Google Calendar',
        key: 'google-calendar',
        description: 'Connect Google Calendar for interview scheduling',
        icon: Calendar,
      },
      {
        title: 'Zoom Meetings',
        key: 'zoom',
        description: 'Connect Zoom for interview scheduling',
        icon: Video,
      },
      {
        title: 'Microsoft Teams',
        key: 'microsoft-teams',
        description: 'Connect Microsoft Teams for interview scheduling',
        icon: Video,
      },
    ],
  },
  {
    title: 'Data & System',
    description: 'Backup, logs, and system management',
    icon: Database,
    settings: [
      {
        title: 'Database Backups',
        key: 'backups',
        description: 'Schedule and manage data backups',
        icon: Archive,
      },
      {
        title: 'System Logs',
        key: 'logs',
        description: 'View system activity and audit logs',
        icon: Activity,
      },
      {
        title: 'Media Assets',
        key: 'assets',
        description: 'Download and manage server media files',
        icon: Download,
      },
    ],
  },
];
