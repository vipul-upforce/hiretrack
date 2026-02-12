'use client';

import { useState } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import AIProvidersConfigs from '../ai-providers';
import { EvaluationSettingsPanel } from '../ai-evaluation-settings/panel';
import type { SettingComponentProps } from '../setting-dialog';
import { SectionSwitcher, SectionOption } from './section-switcher';

const sections: SectionOption[] = [
  {
    id: 'providers',
    title: 'AI Providers',
    description: 'Manage API keys and model selection',
    icon: Bot,
    badge: 'Providers',
  },
  {
    id: 'evaluation',
    title: 'AI Evaluation Settings',
    description: 'Control scoring logic and evaluation rules',
    icon: Sparkles,
    badge: 'Scoring',
  },
];

export default function AICommunicationSettings({
  onClose,
}: SettingComponentProps) {
  const [activeSection, setActiveSection] = useState('providers');

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="px-6 pt-4">
        <SectionSwitcher
          options={sections}
          activeId={activeSection}
          onChange={setActiveSection}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeSection === 'evaluation' ? (
          <EvaluationSettingsPanel onClose={onClose} />
        ) : (
          <AIProvidersConfigs onClose={onClose} embedded />
        )}
      </div>
    </div>
  );
}
