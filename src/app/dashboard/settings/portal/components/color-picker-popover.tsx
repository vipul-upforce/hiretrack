import React from 'react';
import { HexColorPicker } from 'react-colorful';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { PREDEFINED_COLORS } from '../constants';

interface ColorPickerPopoverProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPickerPopover({
  value,
  onChange,
  label,
}: ColorPickerPopoverProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-4 w-4 rounded border border-border"
                  style={{ backgroundColor: value }}
                />
                <span>{value}</span>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3">
            <HexColorPicker color={value} onChange={onChange} />
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Preset Colors
              </p>
              <div className="grid grid-cols-5 gap-1">
                {PREDEFINED_COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      'h-6 w-6 rounded border border-border',
                      value === color && 'ring-2 ring-primary ring-offset-2',
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => onChange(color)}
                  />
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder="#RRGGBB"
          className="border bg-background border-border rounded-md px-3 py-1.5 w-24 focus:outline-none ring-primary ring-offset-2 text-sm"
        />
      </div>
    </div>
  );
}
