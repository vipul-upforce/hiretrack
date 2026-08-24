import {
  Type,
  FileText,
  Hash,
  ChevronDown,
  List,
  Circle,
  CheckSquare,
  Calendar,
  Timer,
  CalendarClock,
  Lock,
  Upload,
} from 'lucide-react';
import React from 'react';

export const FIELD_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'email', label: 'Email Input' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'number', label: 'Number Input' },
  { value: 'select', label: 'Select Dropdown' },
  { value: 'multiSelect', label: 'Multi-Select Dropdown' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date Picker' },
  { value: 'time', label: 'Time Picker' },
  { value: 'datetime', label: 'Date & Time Picker' },
  { value: 'password', label: 'Password' },
  { value: 'file', label: 'File Upload' },
];

export const fieldTypeIcons: Record<string, React.ElementType> = {
  text: Type,
  textarea: FileText,
  number: Hash,
  email: Type,
  select: ChevronDown,
  multiSelect: List,
  radio: Circle,
  checkbox: CheckSquare,
  date: Calendar,
  time: Timer,
  datetime: CalendarClock,
  password: Lock,
  file: Upload,
};
