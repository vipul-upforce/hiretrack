
"use client"

import * as React from "react"
import { CalendarIcon, X, Clock } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { Dayjs } from "dayjs"
import dayjs from "dayjs"

export function DateTimePicker({
  value,
  onChange,
  onBlur,
  placeholder = "MM/DD/YYYY hh:mm aa",
  allowClear = true,
}: {
  value?: Dayjs | null
  onChange: (date: Dayjs | null) => void
  onBlur?: () => void
  placeholder?: string
  allowClear?: boolean
}) {
  const [date, setDate] = React.useState<Date | undefined>(value?.toDate())
  const [isOpen, setIsOpen] = React.useState(false)

  const hours = Array.from({ length: 12 }, (_, i) => i + 1)

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // If no time was set before, set default time to current time
      const newDate = date ? new Date(selectedDate) : new Date(selectedDate)
      if (!date) {
        const now = new Date()
        newDate.setHours(now.getHours())
        newDate.setMinutes(now.getMinutes())
      } else {
        newDate.setHours(date.getHours())
        newDate.setMinutes(date.getMinutes())
      }
      setDate(newDate)
      onChange(dayjs(newDate))
    }
  }

  const handleTimeChange = (type: "hour" | "minute" | "ampm", value: string) => {
    if (date) {
      const newDate = new Date(date)
      if (type === "hour") {
        const hour = Number.parseInt(value)
        const currentHours = newDate.getHours()
        const isPM = currentHours >= 12
        newDate.setHours(isPM ? (hour === 12 ? 12 : hour + 12) : hour === 12 ? 0 : hour)
      } else if (type === "minute") {
        newDate.setMinutes(Number.parseInt(value))
      } else if (type === "ampm") {
        const currentHours = newDate.getHours()
        if (value === "PM" && currentHours < 12) {
          newDate.setHours(currentHours + 12)
        } else if (value === "AM" && currentHours >= 12) {
          newDate.setHours(currentHours - 12)
        }
      }
      setDate(newDate)
      onChange(dayjs(newDate))
    }
  }

  const handleClearDate = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDate(undefined)
    onChange(null)
    onBlur?.()
  }

  const handleClearTime = () => {
    if (date) {
      const newDate = new Date(date)
      newDate.setHours(0, 0, 0, 0)
      setDate(newDate)
      onChange(dayjs(newDate))
    }
  }

  const handleSetCurrentTime = () => {
    if (date) {
      const now = new Date()
      const newDate = new Date(date)
      newDate.setHours(now.getHours())
      newDate.setMinutes(now.getMinutes())
      setDate(newDate)
      onChange(dayjs(newDate))
    }
  }

  React.useEffect(() => {
    if (value) {
      setDate(value.toDate())
    } else {
      setDate(undefined)
    }
  }, [value])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "MM/dd/yyyy hh:mm aa") : <span>{placeholder}</span>}
          {allowClear && date && (
            <X className="ml-auto h-4 w-4 opacity-50 hover:opacity-100" onClick={handleClearDate} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="sm:flex">
          <div className="p-3">
            <Calendar mode="single" selected={date} onSelect={handleDateSelect} initialFocus />

            {/* Date Actions */}
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date()
                  if (date) {
                    today.setHours(date.getHours())
                    today.setMinutes(date.getMinutes())
                  }
                  setDate(today)
                  onChange(dayjs(today))
                }}
                className="flex-1"
              >
                Today
              </Button>
              {allowClear && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDate(undefined)
                    onChange(null)
                    setIsOpen(false)
                  }}
                  className="flex-1"
                >
                  Clear Date
                </Button>
              )}
            </div>
          </div>

          {date && (
            <>
              <Separator orientation="vertical" className="hidden sm:block" />
              <Separator className="sm:hidden" />

              <div className="flex flex-col">
                {/* Time Header */}
                <div className="flex items-center justify-between p-3 border-b">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">Time</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={handleSetCurrentTime} className="text-xs">
                      Now
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleClearTime} className="text-xs">
                      Clear
                    </Button>
                  </div>
                </div>

                {/* Time Selectors */}
                <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
                  {/* Hours */}
                  <div className="flex flex-col">
                    <div className="p-2 text-center text-xs font-medium text-muted-foreground border-b">Hour</div>
                    <ScrollArea className="w-64 sm:w-auto flex-1">
                      <div className="flex sm:flex-col p-2">
                        {hours.map((hour) => (
                          <Button
                            key={hour}
                            size="icon"
                            variant={
                              date && (date.getHours() % 12 === 0 ? 12 : date.getHours() % 12) === hour
                                ? "default"
                                : "ghost"
                            }
                            className="sm:w-full shrink-0 aspect-square"
                            onClick={() => handleTimeChange("hour", hour.toString())}
                          >
                            {hour}
                          </Button>
                        ))}
                      </div>
                      <ScrollBar orientation="horizontal" className="sm:hidden" />
                    </ScrollArea>
                  </div>

                  {/* Minutes */}
                  <div className="flex flex-col">
                    <div className="p-2 text-center text-xs font-medium text-muted-foreground border-b">Minute</div>
                    <ScrollArea className="w-64 sm:w-auto flex-1">
                      <div className="flex sm:flex-col p-2">
                        {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                          <Button
                            key={minute}
                            size="icon"
                            variant={date && date.getMinutes() === minute ? "default" : "ghost"}
                            className="sm:w-full shrink-0 aspect-square"
                            onClick={() => handleTimeChange("minute", minute.toString())}
                          >
                            {minute.toString().padStart(2, "0")}
                          </Button>
                        ))}
                      </div>
                      <ScrollBar orientation="horizontal" className="sm:hidden" />
                    </ScrollArea>
                  </div>

                  {/* AM/PM */}
                  <div className="flex flex-col">
                    <div className="p-2 text-center text-xs font-medium text-muted-foreground border-b">Period</div>
                    <ScrollArea className="flex-1">
                      <div className="flex sm:flex-col p-2">
                        {["AM", "PM"].map((ampm) => (
                          <Button
                            key={ampm}
                            size="icon"
                            variant={
                              date &&
                              ((ampm === "AM" && date.getHours() < 12) || (ampm === "PM" && date.getHours() >= 12))
                                ? "default"
                                : "ghost"
                            }
                            className="sm:w-full shrink-0 aspect-square"
                            onClick={() => handleTimeChange("ampm", ampm)}
                          >
                            {ampm}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center p-3 border-t">
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setIsOpen(false)
              onBlur?.()
            }}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
