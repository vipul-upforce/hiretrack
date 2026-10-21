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
  AlertTriangle,
  MessageCircleCode,
  Layers,
} from 'lucide-react';
import { SettingGroup } from './types';

const communicationLegacySettings = [
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
    description:
      'Main AI providers (Gemini, OpenAI, Claude, Perplexity) for candidate evaluation',
    icon: Bot,
  },
  {
    title: 'Bulk CV AI',
    key: 'bulk-cv-ai',
    description:
      'CV upload parsing: multiple provider keys or a single main AI provider',
    icon: Layers,
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
];

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
    ],
  },
  {
    title: 'AI & Evaluation',
    description: 'AI provider configuration and evaluation controls',
    icon: Bot,
    settings: [
      {
        title: 'AI Providers & Evaluation',
        key: 'communication-ai',
        description: 'Choose AI providers and tune evaluation criteria',
        icon: Sparkles,
      },
    ],
  },
  {
    title: 'Communication',
    description: 'Email delivery and notification templates',
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
        title: 'Teams Message Templates',
        key: 'teams-templates',
        description: 'Customize Microsoft Teams reminder message templates',
        icon: MessageCircleCode,
      },
    ],
  },
  {
    title: 'Meeting Integrations',
    description: 'Video interview scheduling connections',
    icon: Video,
    settings: [
      {
        title: 'Meeting Integrations',
        key: 'communication-meetings',
        description: 'Connect Google Meet, Zoom, and Microsoft Teams',
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
        title: '502 Error Page',
        key: 'error-502',
        description: 'Design the 502 Bad Gateway experience served by Nginx',
        icon: AlertTriangle,
      },
      {
        title: 'Media Assets',
        key: 'assets',
        description: 'Download and manage server media files',
        icon: Download,
      },
      {
        title: 'About',
        key: 'version',
        description: 'View application information and manage updates',
        icon: ArrowUpCircle,
      },
    ],
  },
];

const allSettings = settingGroups.flatMap((group) => group.settings);

export const settingsByKey = [
  ...allSettings,
  ...communicationLegacySettings,
].reduce(
  (acc, setting) => {
    acc[setting.key] = setting;
    return acc;
  },
  {} as Record<string, (typeof allSettings)[number]>,
);
