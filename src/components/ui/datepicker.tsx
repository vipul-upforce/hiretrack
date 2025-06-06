import React, { useEffect } from 'react'
import { PopoverTrigger } from './popover';
import { Popover, PopoverContent } from './popover';
import { Button } from './button';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar as CalendarComponent } from './calendar';


function DatePicker({
  value,
  onChange,
  onBlur,
}: {
  value: Date;
  onChange: (date: Date) => void;
  onBlur: () => void;
}) {
  const [date, setDate] = React.useState<Date>(value);

  useEffect(() => {
    if (value) {
      setDate(value);
    }
  }, [value]);

  return (
    <Popover modal={true}>
      <PopoverTrigger asChild>
      <Button
        variant={"outline"}
        className={cn(
          "w-full justify-start text-left font-normal",
          !date && "text-muted-foreground"
        )}
      >
        <Calendar className="mr-2 h-4 w-4" />
        {date ? (
          format(date, "PPP")
        ) : (
          <span>Pick a date</span>
        )}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0 bg-white" align="start">
      <CalendarComponent
        mode="single"
        selected={
          date
            ? new Date(date) // Ensure it's treated as a string
            : undefined
        }
        onSelect={(date: Date | undefined) => {
          setDate(date ? date : new Date());
          onChange(date ? date : new Date());
          onBlur();
        }}
        initialFocus
      />
    </PopoverContent>
  </Popover>
  )
}

export default DatePicker;