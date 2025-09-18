"use client";

import React, { useRef, useState, useEffect } from "react";
import MultiDatePicker from "react-multi-date-picker";
import TimePicker from "react-multi-date-picker/plugins/time_picker";
import { Calendar, Clock, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import "./wren-datepicker.css";

// Common plugin for Today, Now, Done buttons (flex row)
const PickerActionsPlugin = ({
  onChange,
  onDone,
  showNow,
  pickerRef,
  position,
}: {
  onChange: (date: any) => void;
  onDone: () => void;
  showNow: boolean;
  pickerRef: React.RefObject<any>;
  position: "bottom" | "top";
}) => {
  const handleClear = () => {
    onChange(null);
  };

  return (
    <div
      className={`flex items-center justify-between gap-2 p-3 border-t border-border/30 bg-muted/20 ${
        position === "top" ? "border-b" : ""
      }`}
    >
      <div className="flex gap-2">
        <button
          type="button"
          className="flex items-center gap-1 px-1.5 py-1 rounded border border-border text-[0.7rem] font-medium bg-background hover:bg-muted transition"
          onClick={() => onChange(new Date(new Date().setHours(0, 0, 0, 0)))}
        >
          <Calendar className="h-3 w-3" /> Today
        </button>
        {showNow && (
          <button
            type="button"
            className="flex items-center gap-1 px-1.5 py-1 rounded border border-border text-[0.7rem] font-medium bg-background hover:bg-muted transition"
            onClick={() => onChange(new Date())}
          >
            <Clock className="h-3 w-3" /> Now
          </button>
        )}
        <button
          type="button"
          className="flex items-center gap-1 px-1.5 py-1 rounded border border-border text-[0.7rem] font-medium bg-background hover:bg-muted transition"
          onClick={handleClear}
        >
          <X className="h-3 w-3" /> Clear
        </button>
      </div>
      <button
        type="button"
        className="flex items-center gap-1 px-1.5 py-1 rounded border border-primary text-[0.7rem] font-bold bg-primary/90 text-white hover:bg-primary"
        onClick={onDone}
        style={{
          backgroundColor: "var(--portal-primary, #6366f1)",
          borderColor: "var(--portal-primary, #6366f1)",
        }}
      >
        <Check className="h-3 w-3" /> Done
      </button>
    </div>
  );
};
PickerActionsPlugin.position = "bottom";

interface DatePickerProps {
  value: any;
  onChange: (date: any) => void;
  format?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showTimePicker?: boolean;
  timePickerPosition?: "bottom" | "right" | "left" | "top";
  timePickerProps?: Record<string, any>;
  showNowButton?: boolean;
  range?: boolean;
  open?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  portalContainer?: HTMLElement | null;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  format = "MM/DD/YYYY",
  placeholder = "Select date",
  className = "",
  disabled = false,
  showTimePicker = true,
  timePickerPosition = "bottom",
  timePickerProps = {},
  showNowButton = true,
  range = false,
  open,
  onOpen,
  onClose,
  portalContainer,
}) => {
  // console.log(value, "value");

  const pickerRef = useRef<any>(null);
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
      pickerRef={pickerRef}
    />,
  ];

  // Control open/close state
  const controlledOpen = open !== undefined ? open : internalOpen;

  // Global click listener to detect outside clicks
  useEffect(() => {
    if (internalOpen && showTimePicker) {
      const handleClick = (event: MouseEvent) => {
        if (
          pickerContainerRef.current &&
          !pickerContainerRef.current.contains(event.target as Node)
        ) {
          allowOutsideClose.current = true;
          if (pickerRef.current) pickerRef.current.closeCalendar();
        }
      };
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [internalOpen, showTimePicker]);

  // Use the same className as the Input component
  const inputClassName =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

  const handleClear = () => {
    onChange(null);
  };

  return (
    <div ref={pickerContainerRef} className={cn("relative", className)}>
      <MultiDatePicker
        ref={pickerRef}
        value={value}
        onChange={onChange}
        format={format}
        placeholder={placeholder}
        className="wren-picker"
        inputClass={inputClassName}
        disabled={disabled}
        plugins={plugins}
        calendarPosition="bottom"
        range={range}
        portal={!!portalContainer}
        portalTarget={portalContainer}
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
          )
            return false;
          setInternalOpen(false);
          doneClicked.current = false;
          allowOutsideClose.current = false;
          onClose?.();
        }}
      />
    </div>
  );
};
