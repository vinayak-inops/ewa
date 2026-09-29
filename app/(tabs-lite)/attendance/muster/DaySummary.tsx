/**
 * DaySummary — Day work info in sentence format, AttendanceAlert card style
 */

import React, { useMemo } from 'react';
import { AttendanceAlert } from './AttendanceAlert';
import { buildAttendanceDetail, type AttendanceRow } from './PunchRecords';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toHHMM(value: string): string | null {
  if (!value?.trim() || value === '-') return null;
  const dt = new Date(value);
  if (isNaN(dt.getTime())) return null;
  return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

function minsToWords(mins: number): string {
  if (!mins || mins <= 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} minute${m !== 1 ? 's' : ''}`;
  if (m === 0) return `${h} hour${h !== 1 ? 's' : ''}`;
  return `${h} hour${h !== 1 ? 's' : ''} ${m} minute${m !== 1 ? 's' : ''}`;
}

function minsToShort(mins: number): string {
  if (!mins || mins <= 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  attendanceRow: AttendanceRow | null;
  selectedDate:  Date;
};

export function DaySummary({ attendanceRow, selectedDate }: Props) {
  const cards = useMemo(() => {
    const d         = selectedDate.getDate();
    const mon       = MON[selectedDate.getMonth()];
    const yr        = selectedDate.getFullYear();
    const dateLabel = `${d} ${mon} ${yr}`;

    type CardProps = React.ComponentProps<typeof AttendanceAlert>;
    const result: CardProps[] = [];

    // ── No record ──
    if (!attendanceRow) {
      result.push({
        title:    `${dateLabel}`,
        message:  'No attendance record was found for this day.',
        severity: 'info',
      });
      return result;
    }

    const det     = buildAttendanceDetail(attendanceRow);
    const id      = det.attendanceID.trim().toUpperCase();
    const firstIn = toHHMM(det.firstIn);
    const lastOut = toHHMM(det.lastOut);

    const workedMins = det.hoursWorked > 24 ? det.hoursWorked : det.hoursWorked * 60;
    const workedStr  = minsToWords(workedMins);
    const workedShort = minsToShort(workedMins);

    const lateStr   = det.lateIn   > 0 ? minsToWords(det.lateIn)   : '';
    const earlyStr  = det.earlyOut > 0 ? minsToWords(det.earlyOut) : '';
    const otStr     = det.otHours  > 0 ? minsToWords(det.otHours > 24 ? det.otHours : det.otHours * 60) : '';
    const shift     = det.shiftCode !== '-' ? det.shiftCode : '';

    // ── Absent ──
    if (id === 'AA') {
      result.push({
        title:    `${dateLabel} — Marked absent`,
        message:  firstIn
          ? `A punch was recorded at ${firstIn} but it couldn't be matched to a shift. Please raise a correction so your supervisor can review the device log.`
          : `No punch was recorded for this day. If you were present, please raise a correction request with your supervisor.`,
        badge:    { count: d, label: mon },
        severity: 'absent',
      });
      return result;
    }

    // ── Half day ──
    if (id === 'HH') {
      result.push({
        title:    `${dateLabel} — Half day`,
        message:  firstIn && lastOut
          ? `You were present for half the day. You clocked in at ${firstIn} and out at ${lastOut}.${lateStr ? ` You arrived ${lateStr} late.` : ''}`
          : `Only half a day of attendance was recorded for this date.`,
        badge:    { count: d, label: mon },
        severity: 'absent',
      });
      return result;
    }

    // ── Week off ──
    if (id === 'WW') {
      result.push({
        title:    `${dateLabel} — Week off`,
        message:  'This day is recorded as your weekly off. No attendance is required.',
        severity: 'info',
      });
      return result;
    }

    // ── Present ──
    if (id === 'PP' || firstIn) {
      // Build a flowing sentence
      const parts: string[] = [];

      if (firstIn && lastOut && workedStr)
        parts.push(`You worked ${workedStr}, clocking in at ${firstIn} and out at ${lastOut}.`);
      else if (firstIn && workedStr)
        parts.push(`You clocked in at ${firstIn} and worked ${workedStr}.`);
      else if (firstIn)
        parts.push(`You clocked in at ${firstIn}.`);

      if (shift)        parts.push(`Assigned shift: ${shift}.`);
      if (lateStr)      parts.push(`You arrived ${lateStr} after the scheduled start time.`);
      if (earlyStr)     parts.push(`You left ${earlyStr} before the scheduled end time.`);
      if (otStr)        parts.push(`You logged ${otStr} of overtime beyond the shift.`);

      result.push({
        title:    `${dateLabel} — Present`,
        message:  parts.join(' '),
        badge:    workedShort !== '—' ? { count: parseFloat(workedShort), label: workedShort.includes('h') ? 'hrs' : 'min' } : undefined,
        severity: 'info',
      });
      return result;
    }

    // ── Fallback ──
    result.push({
      title:   `${dateLabel}`,
      message: 'No detailed attendance information is available for this day.',
      severity: 'info',
    });

    return result;
  }, [attendanceRow, selectedDate]);

  return (
    <>
      {cards.map((card, i) => (
        <AttendanceAlert key={i} {...card} />
      ))}
    </>
  );
}
