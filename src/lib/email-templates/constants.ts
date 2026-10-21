/**
 * Canonical re-export for default email templates.
 * Backend/lib code should import from here, NOT from the dashboard settings path,
 * to keep the server layer decoupled from the frontend settings module.
 */
export {
  defaultTemplates,
  DEFAULT_TEMPLATE_IDS,
} from '@/app/dashboard/settings/templates/constants';
