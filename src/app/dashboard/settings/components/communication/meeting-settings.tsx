'use client';

import { useState } from 'react';
import { Calendar, Video, Users } from 'lucide-react';
import GoogleCalendarSettings from '../google-calendar';
import ZoomSettings from '../zoom';
import MicrosoftTeamsSettings from '../microsoft-teams';
import type { SettingComponentProps } from '../setting-dialog';
import { SectionSwitcher, SectionOption } from './section-switcher';

const sections: SectionOption[] = [
  {
    id: 'google-calendar',
    title: 'Google Calendar / Meet',
    description: 'Connect Google Calendar for Google Meet scheduling',
    icon: Calendar,
    badge: 'Google',
  },
  {
    id: 'zoom',
    title: 'Zoom Meetings',
    description: 'Connect Zoom for interview scheduling',
    icon: Video,
    badge: 'Zoom',
  },
  {
    id: 'microsoft-teams',
    title: 'Microsoft Teams',
    description: 'Connect Teams for interview scheduling',
    icon: Users,
    badge: 'Teams',
  },
];

export default function MeetingCommunicationSettings({
  onClose,
}: SettingComponentProps) {
  const [activeSection, setActiveSection] = useState('google-calendar');

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="px-6 pt-4">
        <SectionSwitcher
          options={sections}
          activeId={activeSection}
          onChange={setActiveSection}
        />
      </div>

      <div className="flex-1 min-h-0 px-6 pb-4">
        {activeSection === 'zoom' && <ZoomSettings onClose={onClose} />}
        {activeSection === 'microsoft-teams' && (
          <MicrosoftTeamsSettings onClose={onClose} />
        )}
        {activeSection === 'google-calendar' && (
          <GoogleCalendarSettings onClose={onClose} />
        )}
      </div>
    </div>
  );
}
