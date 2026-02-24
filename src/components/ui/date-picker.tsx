'use client';

import React, { useRef, useState, useEffect } from 'react';
import MultiDatePicker from 'react-multi-date-picker';
import type { DateObject } from 'react-multi-date-picker';
import TimePicker from 'react-multi-date-picker/plugins/time_picker';
import { Calendar, Clock, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import './wren-datepicker.css';

// Common plugin for Today, Now, Done buttons (flex row)
function PickerActionsPlugin({
  onChange,
  onDone,
  showNow,
  position,
  isRange,
}: {
  onChange: (date: Date | Date[] | null) => void;
  onDone: () => void;
  showNow: boolean;
  position: 'bottom' | 'top';
  isRange?: boolean;
}) {
  const handleClear = () => {
    onChange(null);
  };

  const handleToday = () => {
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    if (isRange) {
      // For range mode, set today as both start and end
      onChange([today, today]);
    } else {
      onChange(today);
    }
  };

  return (
    <div
      className={`flex items-center justify-between gap-2 border-t border-border/30 bg-muted/20 p-3 ${
        position === 'top' ? 'border-b' : ''
      }`}
    >
      <div className="flex gap-2">
        <button
          type="button"
          className="flex items-center gap-1 rounded border border-border bg-background px-1.5 py-1 text-[0.7rem] font-medium transition hover:bg-muted"
          onClick={handleToday}
        >
          <Calendar className="h-3 w-3" /> Today
        </button>
        {showNow && (
          <button
            type="button"
            className="flex items-center gap-1 rounded border border-border bg-background px-1.5 py-1 text-[0.7rem] font-medium transition hover:bg-muted"
            onClick={() => onChange(new Date())}
          >
            <Clock className="h-3 w-3" /> Now
          </button>
        )}
        <button
          type="button"
          className="flex items-center gap-1 rounded border border-border bg-background px-1.5 py-1 text-[0.7rem] font-medium transition hover:bg-muted"
          onClick={handleClear}
        >
          <X className="h-3 w-3" /> Clear
        </button>
      </div>
      <button
        type="button"
        className="bg-primary/90 flex items-center gap-1 rounded border border-primary px-1.5 py-1 text-[0.7rem] font-bold text-white hover:bg-primary"
        onClick={onDone}
        style={{
          backgroundColor: 'var(--portal-primary, #6366f1)',
          borderColor: 'var(--portal-primary, #6366f1)',
        }}
      >
        <Check className="h-3 w-3" /> Done
      </button>
    </div>
  );
}
PickerActionsPlugin.position = 'bottom';

interface DatePickerProps {
  value: Date | Date[] | null;
  onChange: (date: Date | Date[] | null) => void;
  format?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showTimePicker?: boolean;
  timePickerPosition?: 'bottom' | 'right' | 'left' | 'top';
  timePickerProps?: Record<string, unknown>;
  showNowButton?: boolean;
  range?: boolean;
  open?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  portalContainer?: HTMLElement | null;
  disablePortal?: boolean;
}

export function DatePicker({
  value,
  onChange,
  format = 'MM/DD/YYYY',
  placeholder = 'Select date',
  className = '',
  disabled = false,
  showTimePicker = true,
  timePickerPosition = 'bottom',
  timePickerProps = {},
  showNowButton = true,
  range = false,
  onOpen,
  onClose,
  portalContainer,
  disablePortal = false,
}: DatePickerProps) {
  const pickerRef = useRef<{ closeCalendar: () => void } | null>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const doneClicked = useRef(false);
  const allowOutsideClose = useRef(false);
  const pickerContainerRef = useRef<HTMLDivElement>(null);

  // Plugins array, conditionally include TimePicker
  const plugins = [
    ...(showTimePicker
      ? [
          <TimePicker
            key="time"
            position={timePickerPosition}
            hideSeconds
            {...timePickerProps}
          />,
        ]
      : []),
    <PickerActionsPlugin
      position="bottom"
      key="actions"
      onChange={onChange}
      onDone={() => {
        doneClicked.current = true;
        if (pickerRef.current) pickerRef.current.closeCalendar();
      }}
      showNow={!!showTimePicker && showNowButton}
      isRange={range}
    />,
  ];

  // Control open/close state

  // Global click listener to detect outside clicks
  useEffect(() => {
    if (internalOpen && showTimePicker) {
      const handleClick = (event: MouseEvent) => {
        const target = event.target as Node;

        const clickedInsideContainer =
          pickerContainerRef.current &&
          pickerContainerRef.current.contains(target);
        let clickedInsidePortalPicker = false;
        try {
          const el = (event.target as Element) || null;
          clickedInsidePortalPicker =
            !!el && !!el.closest && !!el.closest('.wren-picker');
        } catch {
          clickedInsidePortalPicker = false;
        }

        if (!clickedInsideContainer && !clickedInsidePortalPicker) {
          allowOutsideClose.current = true;
          if (pickerRef.current) pickerRef.current.closeCalendar();
        }
      };
      document.addEventListener('mousedown', handleClick);
      return () => {
        document.removeEventListener('mousedown', handleClick);
      };
    }
    return undefined;
  }, [internalOpen, showTimePicker]);

  // Use the same className as the Input component
  const inputClassName =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm';

  // Convert Date to DateObject for MultiDatePicker
  const handleChange = (date: DateObject | DateObject[] | null) => {
    if (date === null) {
      onChange(null);
      return;
    }
    if (Array.isArray(date)) {
      // For range mode, convert all dates in the array
      if (range) {
        const dateArray = date
          .map((d) => d?.toDate())
          .filter((d): d is Date => d !== undefined && d !== null);
        onChange(dateArray.length > 0 ? dateArray : null);
      } else {
        // For non-range mode with array, take the first date
        onChange(date[0]?.toDate() || null);
      }
      return;
    }
    onChange(date.toDate());
  };

  // Convert value to format expected by MultiDatePicker
  const pickerValue = (() => {
    if (value === null) return null;
    if (Array.isArray(value)) {
      return value;
    }
    return value;
  })();

  const shouldUsePortal = !disablePortal;
  const actualPortalTarget = portalContainer || undefined;

  return (
    <div ref={pickerContainerRef} className={cn('relative', className)}>
      <MultiDatePicker
        ref={pickerRef}
        value={pickerValue}
        onChange={handleChange}
        format={format}
        placeholder={placeholder}
        className="wren-picker"
        inputClass={inputClassName}
        disabled={disabled}
        plugins={plugins}
        calendarPosition="bottom"
        range={range}
        portal={shouldUsePortal}
        portalTarget={actualPortalTarget}
        onOpen={() => {
          setInternalOpen(true);
          doneClicked.current = false;
          allowOutsideClose.current = false;
          onOpen?.();
        }}
        onClose={() => {
          // Allow click outside to always close
          if (
            showTimePicker &&
            !doneClicked.current &&
            !allowOutsideClose.current
          ) {
            return false;
          }
          setInternalOpen(false);
          doneClicked.current = false;
          allowOutsideClose.current = false;
          onClose?.();
          return undefined;
        }}
      />
    </div>
  );
}
