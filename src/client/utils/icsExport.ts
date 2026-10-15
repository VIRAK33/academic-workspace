import { Semester, Course } from '../../types';
import { addDays } from '../hooks/useWorkspace';

export interface IcsExportOptions {
  alarmMinutesBefore?: number; // default 30
  includeSecondAlarm?: boolean; // default true (10 mins before)
  includeAtStartAlarm?: boolean; // default false
}

/**
 * Clean text strings for iCalendar (escape commas, semicolons, backslashes and newlines)
 */
function escapeIcsText(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Format date string 'YYYY-MM-DD' and time 'HH:MM' into iCal floating local time 'YYYYMMDDTHHMMSS'
 */
function formatIcsDateTime(dateIso: string, timeStr: string): string {
  const cleanDate = dateIso.replace(/-/g, '');
  const cleanTime = timeStr.replace(/:/g, '').padEnd(4, '0') + '00';
  return `${cleanDate}T${cleanTime}`;
}

/**
 * Generate standard RFC 5545 iCalendar content for a semester's courses
 */
export function generateSemesterIcs(
  semester: Semester,
  courses: Course[],
  options: IcsExportOptions = {}
): string {
  const {
    alarmMinutesBefore = 30,
    includeSecondAlarm = true,
    includeAtStartAlarm = false,
  } = options;

  const semesterCourses = courses.filter((c) => c.semesterId === semester.id);
  const nowIso = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Academic Workspace//Class Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(semester.name)} Schedule`,
    'X-WR-CALDESC:University Course Schedule with 30-minute advance class reminders',
  ];

  for (const course of semesterCourses) {
    if (!course.schedules || course.schedules.length === 0) continue;
    const activeWeeks = course.activeWeeks && course.activeWeeks.length > 0
      ? course.activeWeeks
      : Array.from({ length: semester.totalWeeks }, (_, i) => i + 1);

    for (const week of activeWeeks) {
      if (week < 1 || week > semester.totalWeeks) continue;

      for (const schedule of course.schedules) {
        // Calculate the exact date for this week and day of week
        // dayOfWeek: 1 = Mon .. 7 = Sun
        const dayOffset = (week - 1) * 7 + (schedule.dayOfWeek - 1);
        const eventDate = addDays(semester.startDate, dayOffset);

        const dtStart = formatIcsDateTime(eventDate, schedule.startTime);
        const dtEnd = formatIcsDateTime(eventDate, schedule.endTime);
        const uid = `class-${course.id}-w${week}-d${schedule.dayOfWeek}-${schedule.startTime.replace(':', '')}@phd-workspace`;

        const summary = `${course.code}: ${course.name}`;
        const location = course.location || 'Campus';
        const descriptionLines = [
          course.name,
          course.teacher ? `Instructor: ${course.teacher}` : '',
          schedule.sessions && schedule.sessions.length > 0 ? `Sessions: ${schedule.sessions.join(', ')}` : '',
          `Academic Week: ${week} of ${semester.totalWeeks}`,
          `Semester: ${semester.name}`,
        ].filter(Boolean);

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${uid}`);
        lines.push(`DTSTAMP:${nowIso}`);
        lines.push(`DTSTART:${dtStart}`);
        lines.push(`DTEND:${dtEnd}`);
        lines.push(`SUMMARY:${escapeIcsText(summary)}`);
        lines.push(`LOCATION:${escapeIcsText(location)}`);
        lines.push(`DESCRIPTION:${escapeIcsText(descriptionLines.join('\n'))}`);
        lines.push('STATUS:CONFIRMED');

        // Primary alarm (e.g. 30 minutes before)
        if (alarmMinutesBefore > 0) {
          lines.push('BEGIN:VALARM');
          lines.push('ACTION:DISPLAY');
          lines.push(`DESCRIPTION:${escapeIcsText(`Class in ${alarmMinutesBefore}m: ${course.code}`)}`);
          lines.push(`TRIGGER:-PT${alarmMinutesBefore}M`);
          lines.push('END:VALARM');
        }

        // Optional secondary alarm (e.g. 10 minutes before)
        if (includeSecondAlarm && alarmMinutesBefore !== 10) {
          lines.push('BEGIN:VALARM');
          lines.push('ACTION:DISPLAY');
          lines.push(`DESCRIPTION:${escapeIcsText(`Class in 10m: ${course.code} at ${location}`)}`);
          lines.push('TRIGGER:-PT10M');
          lines.push('END:VALARM');
        }

        // Optional at-start alarm
        if (includeAtStartAlarm) {
          lines.push('BEGIN:VALARM');
          lines.push('ACTION:DISPLAY');
          lines.push(`DESCRIPTION:${escapeIcsText(`Class starting now: ${course.code}`)}`);
          lines.push('TRIGGER:-PT0M');
          lines.push('END:VALARM');
        }

        lines.push('END:VEVENT');
      }
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Triggers a client-side download of the .ics calendar file
 */
export function downloadIcsFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.ics') ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
