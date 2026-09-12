import React from 'react';
import { AppFonts } from '@/constants/Fonts';

export interface AppDatePickerProps {
  value: Date;
  onValueChange?: (event: { type: 'set'; nativeEvent: { timestamp: number } }, date?: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  mode?: string;
  display?: string;
}

const toDateValue = (value?: Date) => value
  ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  : undefined;

export default function AppDatePicker({ value, onValueChange, minimumDate, maximumDate }: AppDatePickerProps) {
  return React.createElement('input', {
    type: 'date',
    value: toDateValue(value),
    min: toDateValue(minimumDate),
    max: toDateValue(maximumDate),
    'aria-label': 'Select date',
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = event.target.value ? new Date(`${event.target.value}T12:00:00`) : value;
      onValueChange?.({ type: 'set', nativeEvent: { timestamp: selected.getTime() } }, selected);
    },
    style: {
      width: 190,
      minHeight: 44,
      padding: '10px 12px',
      borderRadius: 12,
      border: '1px solid #B9B1A7',
      backgroundColor: 'lightgrey',
      color: 'inherit',
      fontFamily: AppFonts.regular,
      fontSize: 16,
    },
  });
}
