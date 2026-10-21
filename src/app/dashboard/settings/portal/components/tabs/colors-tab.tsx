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
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {PREDEFINED_COLOR_COMBINATIONS.map((combo) => (
              <button
                type="button"
                key={combo.name}
                className={cn(
                  'relative rounded-lg border-2 p-3 transition-all hover:scale-105',
                  settings.primaryColor === combo.primary &&
                    settings.secondaryColor === combo.secondary
                    ? 'border-primary ring-2 ring-primary ring-offset-2'
                    : 'hover:border-primary/50 border-border',
                  combo.isDefault &&
                    'from-primary/5 bg-gradient-to-br to-secondary/5',
                )}
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    primaryColor: combo.primary,
                    secondaryColor: combo.secondary,
                  }))
                }
              >
                {combo.isDefault && (
                  <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <Star className="h-3 w-3 fill-current text-white" />
                  </div>
                )}
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded-full border border-border"
                    style={{ backgroundColor: combo.primary }}
                  />
                  <div
                    className="h-4 w-4 rounded-full border border-border"
                    style={{ backgroundColor: combo.secondary }}
                  />
                </div>
                <p
                  className={cn(
                    'text-center text-xs font-medium',
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ColorPickerPopover
              label="Primary Color"
              value={settings.primaryColor}
              onChange={(color) =>
                setSettings((prev) => ({
                  ...prev,
                  primaryColor: color,
                }))
              }
            />
            <ColorPickerPopover
              label="Secondary Color"
              value={settings.secondaryColor}
              onChange={(color) =>
                setSettings((prev) => ({
                  ...prev,
                  secondaryColor: color,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
