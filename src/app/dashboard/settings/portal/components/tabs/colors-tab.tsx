import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PortalSettings } from '../../types';
import { PREDEFINED_COLOR_COMBINATIONS } from '../../constants';
import { ColorPickerPopover } from '../color-picker-popover';

interface ColorsTabProps {
  settings: PortalSettings;
  setSettings: React.Dispatch<React.SetStateAction<PortalSettings>>;
}

export function ColorsTab({ settings, setSettings }: ColorsTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Color Combinations</CardTitle>
          <CardDescription>
            Choose from predefined color combinations or customize your own
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PREDEFINED_COLOR_COMBINATIONS.map((combo) => (
              <button
                key={combo.name}
                className={cn(
                  'p-3 rounded-lg border-2 transition-all hover:scale-105 relative',
                  settings.primaryColor === combo.primary
                    && settings.secondaryColor === combo.secondary
                    ? 'border-primary ring-2 ring-primary ring-offset-2'
                    : 'border-border hover:border-primary/50',
                  combo.isDefault
                    && 'bg-gradient-to-br from-primary/5 to-secondary/5',
                )}
                onClick={() => setSettings((prev) => ({
                  ...prev,
                  primaryColor: combo.primary,
                  secondaryColor: combo.secondary,
                }))}
              >
                {combo.isDefault && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Star className="w-3 h-3 text-white fill-current" />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-4 h-4 rounded-full border border-border"
                    style={{ backgroundColor: combo.primary }}
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-border"
                    style={{ backgroundColor: combo.secondary }}
                  />
                </div>
                <p
                  className={cn(
                    'text-xs font-medium text-center',
                    combo.isDefault && 'font-semibold',
                  )}
                >
                  {combo.name}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Colors</CardTitle>
          <CardDescription>Fine-tune your color palette</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ColorPickerPopover
              label="Primary Color"
              value={settings.primaryColor}
              onChange={(color) => setSettings((prev) => ({
                ...prev,
                primaryColor: color,
              }))}
            />
            <ColorPickerPopover
              label="Secondary Color"
              value={settings.secondaryColor}
              onChange={(color) => setSettings((prev) => ({
                ...prev,
                secondaryColor: color,
              }))}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
