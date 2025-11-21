# Custom DatePicker Component Implementation Guide

## Overview

This document provides a comprehensive guide for implementing a custom DatePicker component that replicates the exact functionality of the Wren project's DatePicker without sharing any code. The component provides advanced date-time selection capabilities with custom actions, theming support, and flexible configuration options.

## Architecture & Dependencies

### Core Dependencies

```json
{
  "react-multi-date-picker": "^4.5.2",
  "date-fns": "^3.6.0",
  "lucide-react": "^0.462.0"
}
```

### UI Framework Dependencies (shadcn/ui compatible)

```json
{
  "@radix-ui/react-slot": "^1.1.0",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.5.2"
}
```

### Required Utility Function

Create a `cn` utility function for class name merging:

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Component Architecture

### 1. Main DatePicker Component Structure

**File: `DatePicker.tsx`**

The component should be built with the following structure:

#### Props Interface

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

#### Core Features to Implement

1. **Base MultiDatePicker Integration**
   - Import `MultiDatePicker` from `react-multi-date-picker`
   - Import `TimePicker` from `react-multi-date-picker/plugins/time_picker`
   - Configure with proper refs and state management

2. **Custom Actions Plugin**
   - Create a custom plugin component with Today/Now/Done buttons
   - Position at bottom of picker
   - Implement click handlers for each action
   - Use Lucide React icons: Calendar, Clock, Check

3. **State Management**
   - Use `useRef` for picker reference
   - Use `useState` for internal open state
   - Use `useRef` for tracking done button clicks
   - Use `useRef` for tracking outside click allowance
   - Use `useRef` for picker container reference

4. **Click Outside Handling**
   - Implement `useEffect` with global click listener
   - Only close on outside click if `allowOutsideClose.current` is true
   - Prevent premature closing during time picker interaction

### 2. Theme Integration

#### Theme Hook Structure

Create a theme hook that provides:

```typescript
interface ThemeContextType {
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  isDark: boolean;
}
```

#### Theme Provider Implementation

- Store theme preference in localStorage
- Apply theme classes to document root
- Listen for system theme changes
- Support user profile theme override

### 3. Custom Actions Plugin Implementation

#### Plugin Component Structure

```typescript
const PickerActionsPlugin = ({
  onChange,
  onDone,
  showNow,
  pickerRef,
}: {
  onChange: (date: any) => void;
  onDone: () => void;
  showNow: boolean;
  pickerRef: React.RefObject<any>;
}) => {
  // Plugin implementation
};
PickerActionsPlugin.position = "bottom";
```

#### Plugin Features

1. **Today Button**
   - Sets date to current date at 00:00:00
   - Uses Calendar icon from Lucide React
   - Styled as secondary button

2. **Now Button** (conditional)
   - Sets date to current date and time
   - Only shows when `showTimePicker` and `showNowButton` are true
   - Uses Clock icon from Lucide React
   - Styled as secondary button

3. **Done Button**
   - Closes the picker
   - Uses Check icon from Lucide React
   - Styled as primary button
   - Sets done click flag to prevent immediate reopen

## Styling Implementation

### 1. Input Styling

Use shadcn/ui compatible input classes:

```typescript
const inputClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";
```

### 2. Custom CSS for Dark Mode

Create a CSS file (`wren-datepicker.css`) with the following selectors:

#### Main Container Styling

```css
.dark .wren-picker.rmdp-wrapper {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  border-color: hsl(var(--border));
}
```

#### Header Styling

```css
.dark .wren-picker.rmdp-wrapper .rmdp-header {
  background: hsl(var(--muted) / 0.2);
  color: hsl(var(--foreground));
  border-color: hsl(var(--border));
}

.dark .wren-picker.rmdp-wrapper .rmdp-header-values {
  color: hsl(var(--foreground));
}
```

#### Day Cell Styling

```css
.dark .wren-picker.rmdp-wrapper .rmdp-day {
  color: hsl(var(--foreground));
}

.dark .wren-picker.rmdp-wrapper .rmdp-day:hover {
  background: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}

.dark .wren-picker.rmdp-wrapper .rmdp-day.rmdp-selected {
  color: hsl(var(--primary-foreground));
}

.dark .wren-picker.rmdp-wrapper .rmdp-week-day {
  color: hsl(var(--muted-foreground));
}

.dark .wren-picker.rmdp-wrapper .rmdp-day.rmdp-today span {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}
```

#### Action Buttons Styling

```css
.dark .wren-picker .flex.items-center.justify-between.gap-2.p-3 button {
  background: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
  border-color: hsl(var(--border));
}

.dark .wren-picker .flex.items-center.justify-between.gap-2.p-3 button:hover {
  background: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}

.dark
  .wren-picker
  .flex.items-center.justify-between.gap-2.p-3
  button.border-primary {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-color: hsl(var(--primary));
}
```

#### Time Picker Styling

```css
.dark .wren-picker.rmdp-wrapper .rmdp-time-picker {
  background: hsl(var(--background));
  border-color: hsl(var(--border));
}

.dark .wren-picker.rmdp-wrapper .rmdp-time-picker input {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  border-color: hsl(var(--border));
}

.rmdp-time-picker div input {
  width: 30px !important;
}

.rmdp-container {
  width: 100% !important;
}
```

### 3. CSS Custom Properties Required

Ensure your CSS framework provides these custom properties:

- `--background`
- `--foreground`
- `--border`
- `--muted`
- `--muted-foreground`
- `--accent`
- `--accent-foreground`
- `--primary`
- `--primary-foreground`
- `--secondary`
- `--secondary-foreground`
- `--ring`
- `--input`

## Implementation Details

### 1. Plugin Configuration

```typescript
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
    key="actions"
    position="bottom"
    onChange={onChange}
    onDone={() => {
      doneClicked.current = true;
      if (pickerRef.current) pickerRef.current.closeCalendar();
    }}
    showNow={!!showTimePicker && showNowButton}
    pickerRef={pickerRef}
  />,
];
```

### 2. MultiDatePicker Configuration

```typescript
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
  onOpen={() => {
    setInternalOpen(true);
    doneClicked.current = false;
    allowOutsideClose.current = false;
    onOpen?.();
  }}
  onClose={() => {
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
  open={controlledOpen}
  closeOnSelect={!showTimePicker}
/>
```

### 3. Outside Click Handler

```typescript
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
```

## Usage Examples

### Basic Date Picker

```typescript
import { DatePicker } from './components/ui/DatePicker'

function MyComponent() {
  const [date, setDate] = useState(new Date());

  return (
    <DatePicker
      value={date}
      onChange={setDate}
      showTimePicker={false}
    />
  );
}
```

### Date-Time Picker with Custom Format

```typescript
<DatePicker
  value={dateTime}
  onChange={setDateTime}
  format="YYYY-MM-DD HH:mm"
  showTimePicker={true}
  showNowButton={true}
  timePickerPosition="right"
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

### Controlled Open State

```typescript
<DatePicker
  value={date}
  onChange={setDate}
  open={isOpen}
  onOpen={() => setIsOpen(true)}
  onClose={() => setIsOpen(false)}
/>
```

## Advanced Features

### 1. Custom Time Picker Props

```typescript
<DatePicker
  value={date}
  onChange={setDate}
  showTimePicker={true}
  timePickerProps={{
    step: 15, // 15-minute intervals
    hideSeconds: true
  }}
/>
```

### 2. Disabled State

```typescript
<DatePicker
  value={date}
  onChange={setDate}
  disabled={true}
/>
```

### 3. Custom Placeholder

```typescript
<DatePicker
  value={date}
  onChange={setDate}
  placeholder="Choose your date..."
/>
```

## Integration Checklist

- [ ] Install required dependencies
- [ ] Create utility functions (cn)
- [ ] Implement theme provider and hook
- [ ] Create DatePicker component with all props
- [ ] Implement PickerActionsPlugin
- [ ] Add custom CSS styling
- [ ] Configure CSS custom properties
- [ ] Test all functionality modes
- [ ] Verify theme switching works
- [ ] Test outside click behavior
- [ ] Validate accessibility features

## Notes

1. **Performance**: The component uses refs extensively to avoid unnecessary re-renders
2. **Accessibility**: Inherits accessibility features from react-multi-date-picker
3. **Theming**: Fully integrated with CSS custom properties for flexible theming
4. **Browser Support**: Compatible with modern browsers supporting ES6+
5. **Responsive**: Works on mobile and desktop with appropriate touch handling

This implementation provides a pixel-perfect replica of the original DatePicker component with all its advanced features and behaviors.
