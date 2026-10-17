import React, { useMemo, useRef, useEffect } from 'react';
import {
  useWorkspace,
  DAY_NAMES_SHORT,
  MONTH_NAMES_SHORT,
  getTodayIsoDate,
  addDays,
  parseIsoDate,
  timeToMinutes,
  format24To12Range,
} from '../../hooks/useWorkspace';
import { Course, ScheduleEvent } from '../../../types';
import { Clock, MapPin } from 'lucide-react';

interface WeeklyAppleCalendarViewProps {
  ws: ReturnType<typeof useWorkspace>;
  subMode: 'week' | 'month' | 'year';
  weekOffset: number;
  yearOffset?: number;
  onSelectDateAndSwitchToWeek?: (isoDate: string) => void;
  onOpenCourseModal: () => void;
  onEditCourse?: (course: Course) => void;
  onOpenEventModal: () => void;
  onEditEvent?: (event: ScheduleEvent) => void;
  setViewingCourse: (course: Course) => void;
  setViewingEvent: (event: ScheduleEvent) => void;
}

interface CalendarItem {
  id: string;
  kind: 'course' | 'routine' | 'event';
  title: string;
  code?: string;
  location?: string;
  teacher?: string;
  color: string;
  category?: string;
  notes?: string;
  startTime: string;
  endTime: string;
  startMins: number;
  endMins: number;
  durationMins: number;
  timeDisplay12h: string;
  isWeekActive?: boolean;
  isAllDay?: boolean;
  course?: Course;
  event?: ScheduleEvent;
  // Overlap positioning
  colIndex: number;
  totalCols: number;
  topPx: number;
  heightPx: number;
  bottomPx: number;
}

const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function hexToRgba(hex: string, alpha: number): string {
  if (!hex) return `rgba(59, 130, 246, ${alpha})`;
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) || 59;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 130;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 246;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatAppleHourLabel(hour24: number): string {
  if (hour24 === 0 || hour24 === 24) return '12 AM';
  if (hour24 === 12) return 'Noon';
  if (hour24 < 12) return `${hour24} AM`;
  return `${hour24 - 12} PM`;
}

export const WeeklyAppleCalendarView: React.FC<WeeklyAppleCalendarViewProps> = ({
  ws,
  subMode,
  weekOffset,
  yearOffset = 0,
  onSelectDateAndSwitchToWeek,
  onOpenCourseModal,
  onEditCourse,
  onOpenEventModal,
  onEditEvent,
  setViewingCourse,
  setViewingEvent,
}) => {
  const {
    viewedSemester,
    currentAcademicWeek,
    courses,
    events,
    timeSlots,
    showWeekend,
    showRoutines,
    showEvents,
    simulatedMinutes,
    scheduleStartHour = 7,
    scheduleEndHour = 22,
    selectedDate,
    setSelectedDate,
  } = ws;

  // Clean, comfortable row height with zero density buttons
  const hourHeightPx = 56;
  const pxPerMin = hourHeightPx / 60;

  // Week view time range: strictly 5:00 AM to 12:00 AM (midnight)
  const startDayHour = 5;
  const endDayHour = 24;
  const startDayMins = startDayHour * 60; // 300 mins
  const endDayMins = endDayHour * 60; // 1440 mins
  const totalHours = endDayHour - startDayHour; // 19 hours
  const totalCanvasHeight = totalHours * hourHeightPx;

  // Scroll refs for the week timeline container and header synchronization
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const allDayScrollRef = useRef<HTMLDivElement>(null);

  const handleTimelineScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
    if (allDayScrollRef.current) {
      allDayScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Automatically scroll to 7:00 AM on initial mount or when entering week view
  useEffect(() => {
    if (subMode === 'week') {
      const scrollTo7AM = () => {
        if (timelineScrollRef.current) {
          const targetHour = 7;
          const targetY = Math.max(0, (targetHour - startDayHour) * hourHeightPx);
          timelineScrollRef.current.scrollTop = targetY;
        }
      };
      scrollTo7AM();
      const id = setTimeout(scrollTo7AM, 30);
      return () => clearTimeout(id);
    }
  }, [subMode, startDayHour, hourHeightPx]);

  const todayIso = getTodayIsoDate();

  // Active academic week calculated with weekOffset
  const activeWeekNum = Math.max(1, Math.min(viewedSemester.totalWeeks || 19, currentAcademicWeek + weekOffset));

  // Compute Monday of the active week
  const baseMondayIso = useMemo(() => {
    return addDays(viewedSemester.startDate, (activeWeekNum - 1) * 7);
  }, [viewedSemester.startDate, activeWeekNum]);

  // Compute days to display for Week view (Starts on Sunday if 7-day, matching Apple Calendar screenshot)
  const weekDays = useMemo(() => {
    if (!showWeekend) {
      return [1, 2, 3, 4, 5].map((dayNum) => {
        const dateIso = addDays(baseMondayIso, dayNum - 1);
        const dt = parseIsoDate(dateIso);
        return {
          dayNum,
          dateIso,
          dayShort: DAY_NAMES_SHORT[dayNum],
          dayOfMonth: dt.getUTCDate(),
          isToday: dateIso === todayIso,
        };
      });
    }

    const days = [
      { dayNum: 7, offset: -1, short: 'Sun' },
      { dayNum: 1, offset: 0, short: 'Mon' },
      { dayNum: 2, offset: 1, short: 'Tue' },
      { dayNum: 3, offset: 2, short: 'Wed' },
      { dayNum: 4, offset: 3, short: 'Thu' },
      { dayNum: 5, offset: 4, short: 'Fri' },
      { dayNum: 6, offset: 5, short: 'Sat' },
    ];

    return days.map((d) => {
      const dateIso = addDays(baseMondayIso, d.offset);
      const dt = parseIsoDate(dateIso);
      return {
        dayNum: d.dayNum,
        dateIso,
        dayShort: d.short,
        dayOfMonth: dt.getUTCDate(),
        isToday: dateIso === todayIso,
      };
    });
  }, [baseMondayIso, showWeekend, todayIso]);

  // Compute merged session start/end
  const computeMergedSessionBounds = (sessionLabels: string[]) => {
    const matchedSlots = timeSlots.filter((ts) => sessionLabels.includes(ts.session));
    if (matchedSlots.length === 0) return { startTime: '14:30', endTime: '16:05' };
    const sorted = [...matchedSlots].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    return {
      startTime: sorted[0].startTime,
      endTime: sorted[sorted.length - 1].endTime,
    };
  };

  // Precompute layout for each day in displayed week
  const getDayItems = (dayNum: number, dateIso: string): { timed: CalendarItem[]; allDay: CalendarItem[] } => {
    const timedItems: CalendarItem[] = [];
    const allDayItems: CalendarItem[] = [];

    // 1. Courses
    const semCourses = courses.filter((c) => c.semesterId === viewedSemester.id);
    for (const c of semCourses) {
      const isWeekActive = !c.activeWeeks || c.activeWeeks.length === 0 || c.activeWeeks.includes(activeWeekNum);
      for (const sch of c.schedules || []) {
        if (Number(sch.dayOfWeek) !== dayNum) continue;

        let startTime = sch.startTime;
        let endTime = sch.endTime;
        if (!startTime || !endTime) {
          const bounds = computeMergedSessionBounds(sch.sessions || []);
          startTime = bounds.startTime;
          endTime = bounds.endTime;
        }

        const sMin = timeToMinutes(startTime);
        const rawEnd = timeToMinutes(endTime);
        const eMin = rawEnd <= sMin ? sMin + 50 : rawEnd;
        const durationMins = Math.max(25, eMin - sMin);
        const topPx = Math.round((sMin - startDayMins) * pxPerMin);
        const heightPx = Math.max(26, Math.round(durationMins * pxPerMin));

        timedItems.push({
          id: `course_${c.id}_${startTime}`,
          kind: 'course',
          title: c.name,
          code: c.code,
          location: c.location,
          teacher: c.teacher,
          color: c.color || '#9333ea',
          startTime,
          endTime,
          startMins: sMin,
          endMins: eMin,
          durationMins,
          timeDisplay12h: format24To12Range(startTime, endTime),
          isWeekActive,
          course: c,
          colIndex: 0,
          totalCols: 1,
          topPx,
          heightPx,
          bottomPx: topPx + heightPx,
        });
      }
    }

    // 2. Routines and Events
    const semEvents = (events || []).filter((e) => e.semesterId === viewedSemester.id);
    for (const ev of semEvents) {
      let isActiveOnDay = false;
      if (ev.type === 'routine' && showRoutines) {
        const activeWeeksOk = !ev.activeWeeks || ev.activeWeeks.length === 0 || ev.activeWeeks.includes(activeWeekNum);
        const dayOk = (ev.daysOfWeek || []).map(Number).includes(dayNum);
        isActiveOnDay = activeWeeksOk && dayOk;
      } else if (ev.type === 'event' && showEvents) {
        const evStart = ev.specificDate || '';
        const evEnd = ev.endDate || evStart;
        isActiveOnDay = evStart ? (dateIso >= evStart && dateIso <= evEnd) : false;
      }

      if (!isActiveOnDay) continue;

      const isMultiDay = Boolean(ev.endDate && ev.specificDate && ev.endDate > ev.specificDate);
      let dayProgressBadge = '';
      if (isMultiDay && ev.specificDate && ev.endDate) {
        const dStart = new Date(ev.specificDate + 'T00:00:00').getTime();
        const dEnd = new Date(ev.endDate + 'T00:00:00').getTime();
        const dCurr = new Date(dateIso + 'T00:00:00').getTime();
        const totalDays = Math.max(1, Math.round((dEnd - dStart) / (1000 * 60 * 60 * 24)) + 1);
        const currDayNum = Math.max(1, Math.min(totalDays, Math.round((dCurr - dStart) / (1000 * 60 * 60 * 24)) + 1));
        dayProgressBadge = `Day ${currDayNum}/${totalDays}`;
      }

      const isAllDay =
        Boolean(ev.isAllDay) ||
        isMultiDay ||
        (ev.startTime === '00:00' && ev.endTime === '23:59') ||
        !ev.startTime ||
        ev.category === 'Holiday' ||
        ev.category === 'Exam';

      if (isAllDay) {
        allDayItems.push({
          id: `allday_${ev.id}_${dateIso}`,
          kind: ev.type,
          title: dayProgressBadge ? `${ev.title} (${dayProgressBadge})` : ev.title,
          location: ev.location,
          color: ev.color || (ev.type === 'routine' ? '#059669' : '#f97316'),
          category: ev.category,
          notes: ev.notes,
          startTime: ev.startTime || '00:00',
          endTime: ev.endTime || '23:59',
          startMins: 0,
          endMins: 1440,
          durationMins: 1440,
          timeDisplay12h: ev.isAllDay ? 'All Day' : format24To12Range(ev.startTime, ev.endTime),
          isAllDay: true,
          event: ev,
          colIndex: 0,
          totalCols: 1,
          topPx: 0,
          heightPx: 24,
          bottomPx: 24,
        });
        continue;
      }

      let startTime = ev.startTime || '09:00';
      let endTime = ev.endTime || '10:00';
      if (ev.sessions && ev.sessions.length > 0) {
        const bounds = computeMergedSessionBounds(ev.sessions);
        startTime = bounds.startTime;
        endTime = bounds.endTime;
      }

      const sMin = timeToMinutes(startTime);
      const rawEnd = timeToMinutes(endTime);
      const eMin = rawEnd <= sMin ? sMin + 45 : rawEnd;
      const durationMins = Math.max(25, eMin - sMin);
      const topPx = Math.round((sMin - startDayMins) * pxPerMin);
      const heightPx = Math.max(26, Math.round(durationMins * pxPerMin));

      timedItems.push({
        id: `ev_${ev.id}`,
        kind: ev.type,
        title: ev.title,
        location: ev.location,
        color: ev.color || (ev.type === 'routine' ? '#059669' : '#dc2626'),
        category: ev.category,
        notes: ev.notes,
        startTime,
        endTime,
        startMins: sMin,
        endMins: eMin,
        durationMins,
        timeDisplay12h: format24To12Range(startTime, endTime),
        event: ev,
        colIndex: 0,
        totalCols: 1,
        topPx,
        heightPx,
        bottomPx: topPx + heightPx,
      });
    }

    timedItems.sort((a, b) => a.topPx - b.topPx || b.heightPx - a.heightPx || a.id.localeCompare(b.id));

    // Overlap clustering
    const n = timedItems.length;
    const adj: number[][] = Array.from({ length: n }, () => []);

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = timedItems[i];
        const b = timedItems[j];
        if (!(a.bottomPx <= b.topPx + 2 || b.bottomPx <= a.topPx + 2)) {
          adj[i].push(j);
          adj[j].push(i);
        }
      }
    }

    const visited = new Set<number>();
    const clusters: CalendarItem[][] = [];

    for (let i = 0; i < n; i++) {
      if (visited.has(i)) continue;
      const clusterIndices: number[] = [];
      const queue = [i];
      visited.add(i);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        clusterIndices.push(curr);
        for (const neighbor of adj[curr]) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
      clusters.push(clusterIndices.map((idx) => timedItems[idx]).sort((a, b) => a.topPx - b.topPx));
    }

    const layoutItems: CalendarItem[] = [];
    clusters.forEach((cluster) => {
      const colEndTimes: number[] = [];
      cluster.forEach((item) => {
        let placedCol = -1;
        for (let col = 0; col < colEndTimes.length; col++) {
          if (colEndTimes[col] <= item.topPx + 2) {
            placedCol = col;
            colEndTimes[col] = item.bottomPx;
            break;
          }
        }
        if (placedCol === -1) {
          placedCol = colEndTimes.length;
          colEndTimes.push(item.bottomPx);
        }
        item.colIndex = placedCol;
      });

      const totalColsInCluster = colEndTimes.length;
      cluster.forEach((item) => {
        item.totalCols = totalColsInCluster;
        layoutItems.push(item);
      });
    });

    return { timed: layoutItems, allDay: allDayItems };
  };

  const dayItemsMap = useMemo(() => {
    const map: Record<number, { timed: CalendarItem[]; allDay: CalendarItem[] }> = {};
    for (const wd of weekDays) {
      map[wd.dayNum] = getDayItems(wd.dayNum, wd.dateIso);
    }
    return map;
  }, [weekDays, courses, events, viewedSemester.id, activeWeekNum, showRoutines, showEvents, pxPerMin]);

  // Check if any day has all-day items
  const hasAnyAllDay = useMemo(() => {
    return Object.values(dayItemsMap).some((d) => d.allDay.length > 0);
  }, [dayItemsMap]);

  // Current red line position
  const currentIndicatorTop = Math.round((simulatedMinutes - startDayMins) * pxPerMin);
  const showIndicator = simulatedMinutes >= startDayMins && simulatedMinutes <= endDayMins;

  // Month grid (35 cells)
  const monthGridDays = useMemo(() => {
    if (subMode !== 'month') return [];
    const baseDt = parseIsoDate(selectedDate || todayIso);
    const y = baseDt.getUTCFullYear();
    const m = baseDt.getUTCMonth();

    const firstDayOfMonth = new Date(Date.UTC(y, m, 1));
    const firstDow = firstDayOfMonth.getUTCDay(); // 0 = Sun
    const startGridDate = new Date(Date.UTC(y, m, 1 - firstDow));

    const grid = [];
    for (let i = 0; i < 35; i++) {
      const d = new Date(startGridDate.getTime() + i * 86400000);
      const iso = d.toISOString().split('T')[0];
      const dow = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
      const isCurrentMonth = d.getUTCMonth() === m;
      const dayData = getDayItems(dow, iso);
      grid.push({
        iso,
        dayNum: dow,
        dayOfMonth: d.getUTCDate(),
        isCurrentMonth,
        isToday: iso === todayIso,
        items: [...dayData.allDay, ...dayData.timed],
      });
    }
    return grid;
  }, [subMode, selectedDate, todayIso]);

  // Year View: 12 mini months grid (Apple Calendar macOS Image 4)
  const yearMonths = useMemo(() => {
    if (subMode !== 'year') return [];
    const baseDt = parseIsoDate(selectedDate || todayIso);
    const year = baseDt.getUTCFullYear() + yearOffset;

    return Array.from({ length: 12 }, (_, monthIdx) => {
      const monthName = MONTH_NAMES_FULL[monthIdx];
      const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
      const firstDow = new Date(Date.UTC(year, monthIdx, 1)).getUTCDay(); // 0 = Sun

      const cells: Array<{
        dayOfMonth: number;
        iso: string;
        hasEvents: boolean;
      } | null> = [];

      // Blank slots before 1st of month
      for (let b = 0; b < firstDow; b++) {
        cells.push(null);
      }

      // Month days
      for (let day = 1; day <= daysInMonth; day++) {
        const mm = String(monthIdx + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        const iso = `${year}-${mm}-${dd}`;
        const dow = new Date(Date.UTC(year, monthIdx, day)).getUTCDay() || 7;
        const dayData = getDayItems(dow, iso);
        const hasEvents = dayData.allDay.length > 0 || dayData.timed.length > 0;

        cells.push({
          dayOfMonth: day,
          iso,
          hasEvents,
        });
      }

      return {
        monthIndex: monthIdx,
        monthName,
        days: cells,
      };
    });
  }, [subMode, selectedDate, todayIso, yearOffset, courses, events, viewedSemester.id, activeWeekNum]);

  const handleCardClick = (item: CalendarItem) => {
    if (item.kind === 'course' && item.course) {
      setViewingCourse(item.course);
    } else if (item.event) {
      setViewingEvent(item.event);
    }
  };

  return (
    <div className="select-none">
      {/* ── 1. WEEK VIEW (Clean, Noise-Free Apple Calendar) ───────────── */}
      {subMode === 'week' && (
        <div className="flex flex-col h-[60vh] max-h-[60dvh] overflow-hidden">
          {/* Day Column Headers (Matching Table Tab Design Theme) */}
          <div
            ref={headerScrollRef}
            className="overflow-x-hidden border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 shrink-0 z-30"
          >
            <div className="flex min-w-[600px] md:min-w-full">
              <div className="w-14 shrink-0 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center py-1.5 px-1 sm:px-2 font-medium text-center">
                TIME
              </div>

              <div
                className="flex-1 grid divide-x divide-slate-200 dark:divide-slate-800"
                style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}
              >
                {weekDays.map((wd) => {
                  const [, m, d] = wd.dateIso.split('-');
                  const isWeekend = wd.dayNum >= 6;
                  const isToday = wd.isToday;

                  return (
                    <div
                      key={wd.dayNum}
                      onClick={() => setSelectedDate(wd.dateIso)}
                      className={`py-1.5 px-1.5 sm:px-2.5 font-medium transition cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/60 ${
                        isWeekend ? 'bg-slate-100/40 dark:bg-slate-800/60' : ''
                      } ${isToday ? 'text-slate-900 dark:text-white font-bold' : ''}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-center sm:text-left">
                        <span>{wd.dayShort.toUpperCase()}</span>
                        <span className={`font-normal text-[9px] tabular-nums ${isToday ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400'}`}>
                          {Number(m)}/{Number(d)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* All-Day shelf: ONLY shown if there are actual all-day events */}
          {hasAnyAllDay && (
            <div
              ref={allDayScrollRef}
              className="overflow-x-hidden border-b border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/40 shrink-0 min-h-[30px]"
            >
              <div className="flex min-w-[600px] md:min-w-full">
                <div className="w-14 shrink-0 border-r border-slate-200 dark:border-slate-800 font-mono text-[9px] uppercase text-slate-400 flex items-center justify-center py-1 font-medium">
                  ALL-DAY
                </div>
                <div
                  className="flex-1 grid divide-x divide-slate-200 dark:divide-slate-800 p-1"
                  style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}
                >
                  {weekDays.map((wd) => {
                    const allDay = dayItemsMap[wd.dayNum]?.allDay || [];
                    const isWeekend = wd.dayNum >= 6;
                    return (
                      <div key={wd.dayNum} className={`space-y-0.5 px-0.5 ${isWeekend ? 'bg-slate-100/20 dark:bg-slate-800/30' : ''}`}>
                        {allDay.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleCardClick(item)}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold text-white truncate cursor-pointer shadow-2xs hover:opacity-90 transition flex items-center gap-1"
                            style={{ backgroundColor: item.color }}
                          >
                            <span>★</span>
                            <span className="truncate">{item.title}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Continuous Timeline */}
          <div
            ref={timelineScrollRef}
            onScroll={handleTimelineScroll}
            className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar relative"
          >
            <div className="flex min-w-[600px] md:min-w-full pb-8" style={{ height: `${totalCanvasHeight + 28}px` }}>
              {/* Hour Labels */}
              <div className="w-14 shrink-0 border-r border-slate-200/80 dark:border-slate-800 relative bg-slate-50/20 dark:bg-slate-900/20">
                {Array.from({ length: totalHours + 1 }).map((_, idx) => {
                  const hour = startDayHour + idx;
                  const top = idx * hourHeightPx;
                  return (
                    <div
                      key={hour}
                      className="absolute right-2 -translate-y-1/2 text-[10px] font-sans text-slate-400 dark:text-slate-500 tabular-nums text-right pointer-events-none"
                      style={{ top: `${top}px` }}
                    >
                      {formatAppleHourLabel(hour)}
                    </div>
                  );
                })}
              </div>

              {/* Columns */}
              <div
                className="flex-1 grid divide-x divide-slate-200/80 dark:divide-slate-800 relative"
                style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: totalHours + 1 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="absolute left-0 right-0 border-t border-slate-100 dark:border-slate-800/70 pointer-events-none"
                    style={{ top: `${idx * hourHeightPx}px` }}
                  />
                ))}

                {weekDays.map((wd) => {
                  const items = dayItemsMap[wd.dayNum]?.timed || [];
                  const isCurrentToday = wd.isToday;

                  return (
                    <div
                      key={wd.dayNum}
                      className={`relative h-full ${wd.dayNum >= 6 ? 'bg-slate-50/15 dark:bg-slate-950/15' : ''}`}
                    >
                      {isCurrentToday && showIndicator && (
                        <div
                          className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                          style={{ top: `${currentIndicatorTop}px` }}
                        >
                          <span className="w-2 h-2 rounded-full bg-[#dc2626] -ml-1 shadow-2xs shrink-0" />
                          <div className="h-[1.5px] bg-[#dc2626] w-full" />
                        </div>
                      )}

                      {items.map((item) => {
                        const colWidthPct = 100 / item.totalCols;
                        const leftPct = item.colIndex * colWidthPct;

                        return (
                          <div
                            key={item.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick(item);
                            }}
                            className="absolute rounded-md cursor-pointer overflow-hidden p-1.5 transition-all duration-100 hover:shadow-sm hover:brightness-95 dark:hover:brightness-110"
                            style={{
                              top: `${item.topPx}px`,
                              height: `${item.heightPx}px`,
                              left: `calc(${leftPct}% + 1px)`,
                              width: `calc(${colWidthPct}% - 2px)`,
                              backgroundColor: hexToRgba(item.color, 0.10),
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              borderColor: hexToRgba(item.color, 0.25),
                              borderLeftWidth: '3.5px',
                              borderLeftColor: item.color,
                            }}
                            title={`${item.title} (${item.timeDisplay12h})`}
                          >
                            <div className="font-bold text-[10px] leading-tight truncate" style={{ color: item.color }}>
                              {item.code ? `${item.code}:` : item.category || 'Event'}
                            </div>

                            <div className="font-medium text-[11px] text-slate-800 dark:text-slate-100 line-clamp-2 mt-0.5 leading-snug">
                              {item.title}
                            </div>

                            {item.heightPx > 46 && item.location && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate mt-0.5">
                                <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                                <span className="truncate">{item.location}</span>
                              </div>
                            )}

                            {item.heightPx > 60 && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 truncate mt-0.5 tabular-nums">
                                <Clock className="w-2.5 h-2.5 shrink-0" />
                                <span>{item.timeDisplay12h}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. MONTH VIEW (Matching Table Tab Design Theme) ──────────── */}
      {subMode === 'month' && (
        <div className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 divide-x divide-slate-200 dark:divide-slate-800">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => {
              const isWeekend = d === 'Sun' || d === 'Sat';
              return (
                <div
                  key={d}
                  className={`py-1.5 px-1.5 sm:px-2.5 text-center font-medium ${
                    isWeekend ? 'bg-slate-100/40 dark:bg-slate-800/60' : ''
                  }`}
                >
                  {d.toUpperCase()}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200/80 dark:divide-slate-800">
            {monthGridDays.map((cell) => (
              <div
                key={cell.iso}
                onClick={() => {
                  setSelectedDate(cell.iso);
                  if (onSelectDateAndSwitchToWeek) {
                    onSelectDateAndSwitchToWeek(cell.iso);
                  }
                }}
                className={`min-h-[88px] p-1.5 transition cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 flex flex-col justify-between ${
                  cell.isToday
                    ? 'bg-rose-500/5 dark:bg-rose-500/10'
                    : !cell.isCurrentMonth
                    ? 'opacity-40 bg-slate-50/20'
                    : ''
                }`}
              >
                <div className="text-right">
                  <span
                    className={`text-xs font-semibold tabular-nums ${
                      cell.isToday
                        ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#dc2626] text-white font-bold'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {cell.dayOfMonth}
                  </span>
                </div>

                <div className="space-y-0.5 mt-1">
                  {cell.items.slice(0, 2).map((item) => (
                    <div
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardClick(item);
                      }}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium truncate"
                      style={{
                        backgroundColor: hexToRgba(item.color, 0.12),
                        borderLeft: `2.5px solid ${item.color}`,
                        color: item.color,
                      }}
                    >
                      {item.title}
                    </div>
                  ))}
                  {cell.items.length > 2 && (
                    <div className="text-[9px] text-slate-400 pl-1 font-mono">
                      +{cell.items.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 3. YEAR VIEW (Authentic 12-Month Apple Grid - Screenshot 4) ─ */}
      {subMode === 'year' && (
        <div className="p-4 sm:p-6 overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
            {yearMonths.map((m) => (
              <div key={m.monthIndex} className="space-y-2">
                {/* Month Name in Apple's signature red (Screenshot 4) */}
                <h4 className="text-sm font-semibold text-[#dc2626] font-sans">
                  {m.monthName}
                </h4>

                {/* Weekday headers: S M T W T F S */}
                <div className="grid grid-cols-7 text-center text-[10px] font-medium text-slate-400">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayChar, idx) => (
                    <div key={idx}>{dayChar}</div>
                  ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
                  {m.days.map((cell, idx) => {
                    if (!cell) {
                      return <div key={`empty_${idx}`} className="h-6" />;
                    }

                    const isToday = cell.iso === todayIso;

                    return (
                      <div
                        key={cell.iso}
                        onClick={() => {
                          setSelectedDate(cell.iso);
                          if (onSelectDateAndSwitchToWeek) {
                            onSelectDateAndSwitchToWeek(cell.iso);
                          }
                        }}
                        className="h-6 flex flex-col items-center justify-center cursor-pointer relative group"
                        title={cell.iso}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-medium tabular-nums transition ${
                            isToday
                              ? 'bg-[#dc2626] text-white font-bold shadow-xs'
                              : 'text-slate-700 dark:text-slate-300 group-hover:bg-slate-100 dark:group-hover:bg-slate-800'
                          }`}
                        >
                          {cell.dayOfMonth}
                        </span>
                        {cell.hasEvents && !isToday && (
                          <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500 absolute bottom-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
