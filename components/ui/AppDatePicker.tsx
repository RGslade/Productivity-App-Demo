import React from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

export type AppDatePickerProps = {
  value: Date;
  mode?: 'date' | 'time' | 'datetime';
  display?: 'default' | 'spinner' | 'calendar' | 'clock' | 'compact' | 'inline';
  minimumDate?: Date;
  maximumDate?: Date;
  onValueChange?: (event: DateTimePickerEvent, date?: Date) => void;
};

/** Renders the native date picker with the app-wide callback name used by all forms. */
export default function AppDatePicker({ onValueChange, ...props }: AppDatePickerProps) {
  return <DateTimePicker {...(props as React.ComponentProps<typeof DateTimePicker>)} onChange={onValueChange} />;
}
