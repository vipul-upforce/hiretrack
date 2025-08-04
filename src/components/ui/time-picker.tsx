"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function TimePicker({
  name,
  value,
  onChange,
  onBlur,
}: {
  name?: string;
  value: string;
  onChange: (timeString: string) => void;
  onBlur?: () => void;
}) {
  const [selectedTime, setSelectedTime] = React.useState<string>(value || "");
  const [hours, setHours] = React.useState<number>();
  const [minutes, setMinutes] = React.useState<number>();
  const [meridiem, setMeridiem] = React.useState<"AM" | "PM">();

  // Sync with external value changes
  React.useEffect(() => {
    if (value && value !== selectedTime) {
      const [hour, minute] = value.split(":");
      const isPM = parseInt(hour) >= 12;
      const formattedHour = isPM ? (hour === "12" ? "12" : `${parseInt(hour) - 12}`) : (hour === "0" ? "12" : hour);
      setHours(parseInt(formattedHour));
      setMinutes(parseInt(minute));
      setMeridiem(isPM ? "PM" : "AM");
      setSelectedTime(value);
    }
  }, [value, selectedTime]);

  // Handle user selections (only call onChange for user interactions)
  const handleHoursChange = (newHours: string) => {
    const hoursNum = Number.parseInt(newHours);
    setHours(hoursNum);
    
    if (hoursNum && minutes !== undefined && meridiem) {
      const formattedHours = hoursNum === 12
        ? meridiem === "AM" ? "0" : "12"
        : meridiem === "PM" ? hoursNum + 12 : hoursNum;
      const timeString = `${formattedHours}:${minutes.toString().padStart(2, "0")}`;
      setSelectedTime(timeString);
      onChange(timeString);
      onBlur?.();
    }
  };

  const handleMinutesChange = (newMinutes: string) => {
    const minutesNum = Number.parseInt(newMinutes);
    setMinutes(minutesNum);
    
    if (hours !== undefined && minutesNum !== undefined && meridiem) {
      const formattedHours = hours === 12
        ? meridiem === "AM" ? "0" : "12"
        : meridiem === "PM" ? hours + 12 : hours;
      const timeString = `${formattedHours}:${minutesNum.toString().padStart(2, "0")}`;
      setSelectedTime(timeString);
      onChange(timeString);
      onBlur?.();
    }
  };

  const handleMeridiemChange = (newMeridiem: "AM" | "PM") => {
    setMeridiem(newMeridiem);
    
    if (hours !== undefined && minutes !== undefined && newMeridiem) {
      const formattedHours = hours === 12
        ? newMeridiem === "AM" ? "0" : "12"
        : newMeridiem === "PM" ? hours + 12 : hours;
      const timeString = `${formattedHours}:${minutes.toString().padStart(2, "0")}`;
      setSelectedTime(timeString);
      onChange(timeString);
      onBlur?.();
    }
  };

  return (
    <Popover modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !selectedTime && "text-muted-foreground"
          )}
          name={name}
          value={value}
        >
          <Clock className="mr-2 size-4" />
          {selectedTime ? (
            `${hours?.toString().padStart(2, "0")}:${minutes?.toString().padStart(2, "0")} ${meridiem}`
          ) : (
            <span>Pick a time</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4">
        <div className="flex items-end gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="hours">Hours</Label>
            <Select
              value={hours?.toString()}
              onValueChange={handleHoursChange}
            >
              <SelectTrigger id="hours" className="w-[70px]">
                <SelectValue placeholder="Hours" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                  <SelectItem key={hour} value={hour.toString()}>
                    {hour.toString().padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="minutes">Minutes</Label>
            <Select
              value={minutes?.toString()}
              onValueChange={handleMinutesChange}
            >
              <SelectTrigger id="minutes" className="w-[70px]">
                <SelectValue placeholder="Minutes" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                  <SelectItem key={minute} value={minute.toString()}>
                    {minute.toString().padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="meridiem">AM/PM</Label>
            <Select
              value={meridiem}
              onValueChange={handleMeridiemChange}
            >
              <SelectTrigger id="meridiem" className="w-[70px]">
                <SelectValue placeholder="AM/PM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">AM</SelectItem>
                <SelectItem value="PM">PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
