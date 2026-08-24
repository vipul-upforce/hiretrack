# New DatePicker Implementation

## Overview

This document describes the new DatePicker component implementation that replaces the existing date/time picker functionality. The new implementation is based on the `react-multi-date-picker` library and provides enhanced features with better theming support.

## Key Features

### 1. Enhanced DatePicker Component (`src/components/ui/date-picker.tsx`)

- **Modern UI**: Built with `react-multi-date-picker` for better performance and features
- **Theme Support**: Full dark/light mode support with CSS custom properties
- **Custom Actions**: Today, Now, and Done buttons for better UX
- **Flexible Configuration**: Multiple props for customization
- **Time Picker Integration**: Built-in time selection with configurable position
- **Range Support**: Optional date range selection
- **Accessibility**: Inherits accessibility features from the underlying library

### 2. Updated DateTimePicker Component (`src/components/ui/DateTimePicker.tsx`)

- **Dayjs Integration**: Maintains compatibility with existing Dayjs-based code
- **Simplified API**: Uses the new DatePicker internally
- **Backward Compatibility**: Same props interface as before

### 3. Custom Styling (`src/components/ui/wren-datepicker.css`)

- **Dark Mode Support**: Comprehensive dark theme styling
- **CSS Custom Properties**: Uses design system color variables
- **Responsive Design**: Works on mobile and desktop
- **Consistent Theming**: Matches the existing design system

## API Reference

### DatePicker Props

```typescript
interface DatePickerProps {
  value: any; // Current date value
  onChange: (date: any) => void; // Date change handler
  format?: string; // Date format (default: "MM/DD/YYYY HH:mm")
  placeholder?: string; // Input placeholder
  className?: string; // Additional CSS classes
  disabled?: boolean; // Disable the picker
  showTimePicker?: boolean; // Show time selection (default: true)
  timePickerPosition?: "bottom" | "right" | "left" | "top"; // Time picker position
  timePickerProps?: Record<string, any>; // Additional time picker props
  showNowButton?: boolean; // Show "Now" button (default: true)
  range?: boolean; // Enable date range selection
  open?: boolean; // Control open state externally
  onOpen?: () => void; // Open callback
  onClose?: () => void; // Close callback
}
```

### DateTimePicker Props

```typescript
interface DateTimePickerProps {
  value?: Dayjs | null;
  onChange: (date: Dayjs | null) => void;
  onBlur?: () => void;
  placeholder?: string;
  allowClear?: boolean;
}
```

## Usage Examples

### Basic Date & Time Picker

```typescript
import { DatePicker } from "@/components/ui/date-picker";

function MyComponent() {
  const [date, setDate] = useState<Date | null>(null);

  return (
    <DatePicker
      value={date}
      onChange={setDate}
      placeholder="Select date and time"
      showTimePicker={true}
      showNowButton={true}
    />
  );
}
```

### Date Only Picker

```typescript
<DatePicker
  value={date}
  onChange={setDate}
  showTimePicker={false}
  format="MM/DD/YYYY"
  placeholder="Select date only"
/>
```

### DateTimePicker with Dayjs

```typescript
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import dayjs from "dayjs";

function MyComponent() {
  const [dateTime, setDateTime] = useState<dayjs.Dayjs | null>(null);

  return (
    <DateTimePicker
      value={dateTime}
      onChange={setDateTime}
      placeholder="Select date and time"
    />
  );
}
```

### Custom Time Picker Configuration

```typescript
<DatePicker
  value={date}
  onChange={setDate}
  showTimePicker={true}
  timePickerPosition="right"
  timePickerProps={{
    step: 15, // 15-minute intervals
    hideSeconds: true
  }}
/>
```

### Range Date Picker

```typescript
<DatePicker
  value={dateRange}
  onChange={setDateRange}
  range={true}
  showTimePicker={false}
  format="MM/DD/YYYY"
/>
```

## Migration Guide

### From Old DatePicker

**Before:**

```typescript
import DatePicker from "@/components/ui/datepicker";

<DatePicker
  value={date}
  onChange={setDate}
  onBlur={handleBlur}
/>
```

**After:**

```typescript
import { DatePicker } from "@/components/ui/date-picker";

<DatePicker
  value={date}
  onChange={setDate}
  onClose={handleBlur} // Note: onBlur -> onClose
/>
```

### From Old DateTimePicker

The DateTimePicker API remains the same, but now uses the new DatePicker internally.

## Files Modified

1. **`src/components/ui/date-picker.tsx`** - Completely rewritten with new implementation
2. **`src/components/ui/DateTimePicker.tsx`** - Updated to use new DatePicker
3. **`src/components/ui/wren-datepicker.css`** - New CSS file for custom styling
4. **`src/Custom_Fields/Components/CustomFields/RenderField.tsx`** - Updated import and usage

## Dependencies Added

- `react-multi-date-picker`: ^4.5.2 (new dependency)

## Testing

A test page has been created at `/test-datepicker` to demonstrate all features of the new DatePicker component.

## Benefits

1. **Better Performance**: More efficient rendering and state management
2. **Enhanced UX**: Custom action buttons (Today, Now, Done)
3. **Improved Theming**: Better dark mode support
4. **More Features**: Range selection, custom time picker props
5. **Better Accessibility**: Inherits accessibility features from react-multi-date-picker
6. **Consistent Design**: Matches the existing design system

## Browser Support

- Modern browsers supporting ES6+
- Mobile and desktop responsive
- Touch-friendly interface

## Notes

- The component uses refs extensively to avoid unnecessary re-renders
- Theme integration works with the existing theme provider
- All existing functionality has been preserved while adding new features
- The implementation follows the guide specifications exactly
