'use client';

import { BasicFields } from './components/basic-fields';
import { SkillsField } from './components/skills-field';
import { ExperienceField } from './components/experience-field';
import { SalarySection } from './components/salary-section';
import { LinksSection } from './components/links-section';
import { AttachmentsSection } from './components/attachments-section';
import { AdminSettingsSection } from './components/admin-settings-section';
import { JobFormProps } from './types';

export function JobForm(_props?: JobFormProps) {
  return (
    <div className="space-y-4 pt-0">
      <BasicFields />
      <SkillsField />
      <ExperienceField />
      <SalarySection />
      <LinksSection />
      <AttachmentsSection />
      <AdminSettingsSection />
    </div>
  );
}

export type { JobFormProps };

