import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { theme } from '@/theme';

// Native date picker that reads/writes a 'YYYY-MM-DD' string (matching the
// projects.start_date / end_date DATE columns). No manual typing, so the
// value always reflects what the user picks.

type Props = {
  label: string;
  value: string;            // 'YYYY-MM-DD' or ''
  onChange: (value: string) => void;
  error?: string;
  minDate?: string;         // 'YYYY-MM-DD'
};

function parse(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date();
}

function format(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function DateField({ label, value, onChange, error, minDate }: Props) {
  const [open, setOpen] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    // Android fires once and dismisses; iOS stays open until "Done".
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'dismissed' || !selected) return;
    onChange(format(selected));
  };

  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity
        style={[s.input, error && s.inputError]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[s.value, !value && s.placeholder]}>{value || 'Select date'}</Text>
        {value ? (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.clear}>✕</Text>
          </TouchableOpacity>
        ) : (
          <Text style={s.calendar}>📅</Text>
        )}
      </TouchableOpacity>
      {error ? <Text style={s.errorText}>{error}</Text> : null}

      {open && (
        <>
          <DateTimePicker
            value={parse(value)}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={minDate ? parse(minDate) : undefined}
            onChange={handleChange}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={s.doneBtn} onPress={() => setOpen(false)}>
              <Text style={s.doneText}>Done</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { color: theme.textDim, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  inputError: { borderColor: theme.danger },
  value: { color: theme.text, fontSize: 15 },
  placeholder: { color: theme.textDim },
  clear: { color: theme.textDim, fontSize: 14, fontWeight: '700' },
  calendar: { fontSize: 15 },
  errorText: { color: theme.danger, fontSize: 12, marginTop: 4 },
  doneBtn: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 12 },
  doneText: { color: theme.primary, fontWeight: '700', fontSize: 15 },
});
