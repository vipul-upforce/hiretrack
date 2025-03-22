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
  name: string;
  value: string;
  onChange: (timeString: string) => void;
  onBlur: () => void;
}) {
  const [selectedTime, setSelectedTime] = React.useState<string>();
  const [hours, setHours] = React.useState<number>();
  const [minutes, setMinutes] = React.useState<number>();
  const [meridiem, setMeridiem] = React.useState<"AM" | "PM">();

  const handleTimeChange = React.useCallback(() => {
    if (!hours || !minutes || !meridiem) return;
    const formattedHours =
      hours === 12
        ? meridiem === "AM"
          ? "0"
          : "12"
        : meridiem === "PM"
        ? hours + 12
        : hours;
    const formattedMinutes = minutes.toString().padStart(2, "0");
    const timeString = `${formattedHours}:${formattedMinutes}`;
    setSelectedTime(timeString);
    onChange(timeString);
    onBlur();
  }, [hours, minutes, meridiem]);

    React.useEffect(() => {
      handleTimeChange();
    }, [handleTimeChange]);

  React.useEffect(() => {
    if (value) {
      const [hour, minute] = value.split(":");
      const isPM = parseInt(hour) >= 12;
      const formattedHour = isPM ? hour === "12" ? "12" : `${parseInt(hour) - 12}` : hour;
      setHours(parseInt(formattedHour));
      setMinutes(parseInt(minute));
      setMeridiem(isPM ? "PM" : "AM");
      setSelectedTime(value);
    }
  }, [value]);

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
              onValueChange={(value) => setHours(Number.parseInt(value))}
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
              onValueChange={(value) => setMinutes(Number.parseInt(value))}
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
              onValueChange={(value) => setMeridiem(value as "AM" | "PM")}
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
