import React, { useMemo, useState } from 'react';
import {
  useWorkspace,
  DAY_NAMES_FULL,
  DAY_NAMES_SHORT,
  MONTH_NAMES_SHORT,
  getTodayIsoDate,
  addDays,
  calculateAcademicWeek,
  parseIsoDate,
  format12HourTime,
  timeToMinutes,
  format24To12Range,
  formatHumanDate,
  getIsoDayOfWeek,
} from '../../hooks/useWorkspace';
import { Course, CourseSchedule, Task, ScheduleEvent } from '../../../types';
import { Plus, Check, Clock, Pencil, Calendar } from 'lucide-react';
import { Twemoji } from '../common/Twemoji';
import { CourseDetailsModal } from '../modals/CourseDetailsModal';
import { EventDetailsModal } from '../modals/EventDetailsModal';
import { ScheduleHoursModal } from '../modals/ScheduleHoursModal';

interface ScheduleTimelineViewProps {
  ws: ReturnType<typeof useWorkspace>;
  onOpenTaskModal: () => void;
  onEditCourse?: (course: Course) => void;
  onEditEvent?: (event: ScheduleEvent) => void;
}

interface TimelineItem {
  id: string;
  kind: 'course' | 'routine' | 'event';
  title: string;
  code?: string;
  location?: string;
  teacher?: string;
  sessions?: string[] | number[];
  color?: string;
  category?: string;
  startTime: string;
  endTime: string;
  startMins: number;
  endMins: number;
  durationMins: number;
  timeDisplay12h: string;
  isWeekActive?: boolean;
  course?: Course;
  schedule?: CourseSchedule;
  event?: ScheduleEvent;
  colIndex: number;
  totalCols: number;
  topPx: number;
  heightPx: number;
  bottomPx: number;
}

const BASE_START_HOUR = 8;
const BASE_END_HOUR = 21;
const PX_PER_MINUTE = 0.65;
const TOP_PAD_PX = 12;
const BOTTOM_PAD_PX = 16;
const LEFT_GUTTER_PX = 56;

export const ScheduleTimelineView: React.FC<ScheduleTimelineViewProps> = ({
  ws,
  onOpenTaskModal,
  onEditCourse,
  onEditEvent,
}) => {
  const {
    viewedSemester,
    selectedDate,
    setSelectedDate,
    currentAcademicWeek,
    courses,
    events,
    tasks,
    timeSlots,
    showInactiveCourses,
    setShowInactiveCourses,
    scheduleStartHour,
    setScheduleStartHour,
    scheduleEndHour,
    setScheduleEndHour,
    showToast,
    simulatedMinutes,
    setSimulatedMinutes,
    isLiveClock,
    saveCourse,
    saveTask,
    searchQuery,
    advisorMeetings,
  } = ws;

  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);
  const [viewingEvent, setViewingEvent] = useState<ScheduleEvent | null>(null);
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);

  const targetDow = getIsoDayOfWeek(selectedDate);
  const dayName = DAY_NAMES_FULL[targetDow];
  const sim12hStr = format12HourTime(simulatedMinutes, true);

  // Compute merged session start/end
  const computeMergedSessionBounds = (sessionLabels: string[]) => {
    const matchedSlots = timeSlots.filter(ts => sessionLabels.includes(ts.session));
    if (matchedSlots.length === 0) return { startTime: '14:30', endTime: '16:05' };
    const sorted = [...matchedSlots].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    return {
      startTime: sorted[0].startTime,
      endTime: sorted[sorted.length - 1].endTime,
    };
  };

  // Find today's courses
  const todayCourses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list: Array<{
      course: Course;
      schedule: Course['schedules'][0];
      isWeekActive: boolean;
      startTime: string;
      endTime: string;
      timeDisplay12h: string;
    }> = [];

    courses.forEach(c => {
      if (c.semesterId !== viewedSemester.id) return;
      if (q && !c.name.toLowerCase().includes(q) && !c.code.toLowerCase().includes(q) && !c.location.toLowerCase().includes(q)) return;

      const schedulesForDay = (c.schedules || []).filter(s => Number(s.dayOfWeek) === targetDow);
      if (schedulesForDay.length === 0) return;

      const isWeekActive = (c.activeWeeks || []).map(Number).includes(currentAcademicWeek);

      schedulesForDay.forEach(scheduleForDay => {
        let startTime = scheduleForDay.startTime;
        let endTime = scheduleForDay.endTime;

        if (!startTime || !endTime) {
          const bounds = computeMergedSessionBounds((scheduleForDay.sessions || []).map(String));
          startTime = bounds.startTime;
          endTime = bounds.endTime;
        }

        list.push({
          course: c,
          schedule: scheduleForDay,
          isWeekActive,
          startTime,
          endTime,
          timeDisplay12h: format24To12Range(startTime, endTime),
        });
      });
    });

    return list.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [courses, viewedSemester.id, targetDow, currentAcademicWeek, timeSlots, searchQuery]);

  const displayCourses = showInactiveCourses
    ? todayCourses
    : todayCourses.filter(c => c.isWeekActive);

  // Today's events and routines
  const todayEvents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return (events || []).filter(ev => {
      if (ev.semesterId !== viewedSemester.id) return false;
      if (q && !ev.title.toLowerCase().includes(q) && !(ev.location && ev.location.toLowerCase().includes(q))) return false;

      if (ev.type === 'routine') {
        const days = (ev.daysOfWeek || []).map(Number);
        if (!days.includes(targetDow)) return false;
        if (ev.activeWeeks && ev.activeWeeks.length > 0 && !ev.activeWeeks.map(Number).includes(currentAcademicWeek)) return false;
        return true;
      } else if (ev.type === 'event') {
        return ev.specificDate === selectedDate;
      }
      return false;
    }).map(ev => {
      let startTime = ev.startTime;
      let endTime = ev.endTime;
      if ((!startTime || !endTime) && ev.sessions && ev.sessions.length > 0) {
        const bounds = computeMergedSessionBounds(ev.sessions.map(String));
        startTime = startTime || bounds.startTime;
        endTime = endTime || bounds.endTime;
      }
      if (!startTime) startTime = '08:00';
      if (!endTime) endTime = '09:00';
      return {
        event: ev,
        startTime,
        endTime,
        timeDisplay12h: format24To12Range(startTime, endTime),
      };
    }).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [events, viewedSemester.id, targetDow, currentAcademicWeek, selectedDate, searchQuery, timeSlots]);

  // Combine courses & events to determine dynamic timeline bounds
  const allEventsForDay = useMemo(() => {
    const list: Array<{ startMins: number; endMins: number }> = [];
    displayCourses.forEach(c => {
      const s = timeToMinutes(c.startTime);
      const e = timeToMinutes(c.endTime);
      list.push({ startMins: s, endMins: Math.max(s + 30, e) });
    });
    todayEvents.forEach(e => {
      const s = timeToMinutes(e.startTime);
      const eM = timeToMinutes(e.endTime);
      list.push({ startMins: s, endMins: Math.max(s + 30, eM) });
    });
    return list;
  }, [displayCourses, todayEvents]);

  // Dynamic canvas bounds (uses user-defined schedule window, expanding if commitments fall outside)
  const gridStartHour = useMemo(() => {
    const baseStart = Math.floor(scheduleStartHour || 8);
    if (allEventsForDay.length === 0) return baseStart;
    const minMins = Math.min(...allEventsForDay.map(i => i.startMins));
    if (minMins < baseStart * 60) {
      return Math.max(0, Math.floor(minMins / 60));
    }
    return baseStart;
  }, [allEventsForDay, scheduleStartHour]);

  const gridEndHour = useMemo(() => {
    const baseEnd = scheduleEndHour || 21.5;
    if (allEventsForDay.length === 0) return baseEnd;
    const maxMins = Math.max(...allEventsForDay.map(i => i.endMins));
    if (maxMins > baseEnd * 60) {
      return Math.min(24, Math.ceil(maxMins / 60));
    }
    return baseEnd;
  }, [allEventsForDay, scheduleEndHour]);

  const startDayMins = gridStartHour * 60;
  const endDayMins = Math.round(gridEndHour * 60);
  const totalCanvasHeight = Math.round((endDayMins - startDayMins) * PX_PER_MINUTE + TOP_PAD_PX + BOTTOM_PAD_PX);

  // Combine items & compute non-overlapping side-by-side columns based on true visual collisions
  const layoutItems = useMemo(() => {
    const rawItems: TimelineItem[] = [];

    // 1. Add course items
    displayCourses.forEach(({ course, schedule, isWeekActive, startTime, endTime, timeDisplay12h }) => {
      const sMin = timeToMinutes(startTime);
      const rawEnd = timeToMinutes(endTime);
      const eMin = rawEnd <= sMin ? sMin + 45 : rawEnd;
      const durationMins = Math.max(30, eMin - sMin);
      const topPx = Math.round(TOP_PAD_PX + (sMin - startDayMins) * PX_PER_MINUTE);
      const heightPx = Math.max(32, Math.round(durationMins * PX_PER_MINUTE));
      const bottomPx = topPx + heightPx;

      rawItems.push({
        id: `course_${course.id}_${startTime}`,
        kind: 'course',
        title: course.name,
        code: course.code,
        location: course.location,
        teacher: course.teacher,
        sessions: schedule.sessions,
        color: course.color || '#2563eb',
        startTime,
        endTime,
        startMins: sMin,
        endMins: eMin,
        durationMins,
        timeDisplay12h,
        isWeekActive,
        course,
        schedule,
        colIndex: 0,
        totalCols: 1,
        topPx,
        heightPx,
        bottomPx,
      });
    });

    // 2. Add routines and events
    todayEvents.forEach(({ event: ev, startTime, endTime, timeDisplay12h }) => {
      const sMin = timeToMinutes(startTime);
      const rawEnd = timeToMinutes(endTime);
      const eMin = rawEnd <= sMin ? sMin + 30 : rawEnd;
      const durationMins = Math.max(25, eMin - sMin);
      const topPx = Math.round(TOP_PAD_PX + (sMin - startDayMins) * PX_PER_MINUTE);
      const heightPx = Math.max(30, Math.round(durationMins * PX_PER_MINUTE));
      const bottomPx = topPx + heightPx;

      rawItems.push({
        id: `event_${ev.id}`,
        kind: ev.type,
        title: ev.title,
        location: ev.location,
        color: ev.color || (ev.type === 'routine' ? '#059669' : '#dc2626'),
        category: ev.category,
        startTime,
        endTime,
        startMins: sMin,
        endMins: eMin,
        durationMins,
        timeDisplay12h,
        event: ev,
        colIndex: 0,
        totalCols: 1,
        topPx,
        heightPx,
        bottomPx,
      });
    });

    // Sort by vertical position (topPx), then taller cards first
    rawItems.sort((a, b) => a.topPx - b.topPx || b.heightPx - a.heightPx || a.id.localeCompare(b.id));

    // Overlap graph: two items overlap if their vertical pixel intervals collide.
    // Margin of 2px ensures cards that visually touch are side-by-side rather than covering each other.
    const n = rawItems.length;
    const adj: number[][] = Array.from({ length: n }, () => []);

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = rawItems[i];
        const b = rawItems[j];
        const overlaps = !(a.bottomPx <= b.topPx + 2 || b.bottomPx <= a.topPx + 2);
        if (overlaps) {
          adj[i].push(j);
          adj[j].push(i);
        }
      }
    }

    // Connected components (clusters of overlapping items)
    const visited = new Set<number>();
    const clusters: TimelineItem[][] = [];

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

      const clusterItems = clusterIndices
        .map(idx => rawItems[idx])
        .sort((a, b) => a.topPx - b.topPx || b.heightPx - a.heightPx || a.id.localeCompare(b.id));

      clusters.push(clusterItems);
    }

    // Assign side-by-side columns within each cluster
    for (const cluster of clusters) {
      if (cluster.length === 1) {
        cluster[0].colIndex = 0;
        cluster[0].totalCols = 1;
        continue;
      }

      for (let i = 0; i < cluster.length; i++) {
        const item = cluster[i];
        const usedCols = new Set<number>();

        for (let j = 0; j < i; j++) {
          const prev = cluster[j];
          const overlaps = !(item.bottomPx <= prev.topPx + 2 || prev.bottomPx <= item.topPx + 2);
          if (overlaps) {
            usedCols.add(prev.colIndex);
          }
        }

        let col = 0;
        while (usedCols.has(col)) {
          col++;
        }
        item.colIndex = col;
      }

      for (const item of cluster) {
        const concurrentItems = cluster.filter(other =>
          other === item || !(item.bottomPx <= other.topPx + 2 || other.bottomPx <= item.topPx + 2)
        );
        const maxCol = Math.max(...concurrentItems.map(c => c.colIndex));
        item.totalCols = Math.max(2, maxCol + 1);
      }
    }

    return rawItems;
  }, [displayCourses, todayEvents, startDayMins]);

  // Today's due tasks
  const tasksForDay = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return tasks.filter(t => {
      if (t.status === 'archived') return false;
      if (t.semesterId && t.semesterId !== viewedSemester.id) return false;
      if (t.dueDate !== selectedDate) return false;
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, viewedSemester.id, selectedDate, searchQuery]);

  // Combined Academic Situation Archetypes + Action Horizon Scenarios
  const quickScenarios = useMemo(() => {
    const todayIso = getTodayIsoDate();
    const todayDow = getIsoDayOfWeek(todayIso);

    // Helper: evaluate full day details
    const getDayDetails = (isoDate: string) => {
      const dow = getIsoDayOfWeek(isoDate);
      const week = calculateAcademicWeek(isoDate, viewedSemester.startDate);
      const dayShort = DAY_NAMES_SHORT[dow] || '';
      const dt = parseIsoDate(isoDate);
      const dayNum = dt.getUTCDate();
      const monthShort = MONTH_NAMES_SHORT[dt.getUTCMonth()];
      const headerStr = `${dayShort}, ${monthShort} ${dayNum} · W${week}`;

      // Active courses
      const dayCourses: Array<{ course: Course; schedule: Course['schedules'][0]; startTime: string; endTime: string }> = [];
      courses.forEach(c => {
        if (c.semesterId !== viewedSemester.id) return;
        const isWeekActive = (c.activeWeeks || []).map(Number).includes(week);
        if (!isWeekActive) return;
        const scheds = (c.schedules || []).filter(s => Number(s.dayOfWeek) === dow);
        scheds.forEach(s => {
          let st = s.startTime;
          let et = s.endTime;
          if (!st || !et) {
            const b = computeMergedSessionBounds((s.sessions || []).map(String));
            st = st || b.startTime;
            et = et || b.endTime;
          }
          dayCourses.push({ course: c, schedule: s, startTime: st, endTime: et });
        });
      });
      dayCourses.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

      // Active events & routines
      const dayEvents = (events || []).filter(ev => {
        if (ev.semesterId !== viewedSemester.id) return false;
        if (ev.type === 'routine') {
          const days = (ev.daysOfWeek || []).map(Number);
          if (!days.includes(dow)) return false;
          if (ev.activeWeeks && ev.activeWeeks.length > 0 && !ev.activeWeeks.map(Number).includes(week)) return false;
          return true;
        } else if (ev.type === 'event') {
          return ev.specificDate === isoDate;
        }
        return false;
      });

      // Tasks
      const dayTasks = tasks.filter(t => t.status !== 'archived' && t.dueDate === isoDate);

      // Advisor meetings
      const dayMeetings = (advisorMeetings || []).filter(m => m.meetingDate === isoDate);

      return {
        isoDate,
        dow,
        week,
        headerStr,
        dayCourses,
        dayEvents,
        dayTasks,
        dayMeetings,
        totalClasses: dayCourses.length,
      };
    };

    // --- 1. NEXT LECTURE (Action & Attendance) ---
    let nextLectureIso = todayIso;
    let nextLectureSubtitle = 'No classes';
    const todayDetails = getDayDetails(todayIso);
    const upcomingTodayCourse = todayDetails.dayCourses.find(c => timeToMinutes(c.startTime) >= simulatedMinutes - 20);

    if (upcomingTodayCourse) {
      nextLectureIso = todayIso;
      nextLectureSubtitle = `${upcomingTodayCourse.course.code} at ${format12HourTime(timeToMinutes(upcomingTodayCourse.startTime), true)} · ${upcomingTodayCourse.course.location || 'Classroom'}`;
    } else {
      for (let offset = 1; offset <= 10; offset++) {
        const dIso = addDays(todayIso, offset);
        const details = getDayDetails(dIso);
        if (details.dayCourses.length > 0) {
          nextLectureIso = dIso;
          const firstClass = details.dayCourses[0];
          nextLectureSubtitle = `${firstClass.course.code} at ${format12HourTime(timeToMinutes(firstClass.startTime), true)} · ${firstClass.course.location || 'Classroom'}`;
          break;
        }
      }
    }
    const nextLectureDetails = getDayDetails(nextLectureIso);

    // --- 2. PEAK CLASS DAY (Heavy workload day) ---
    let peakDayIso = '';
    let maxClasses = -1;
    for (let offset = 0; offset <= 11; offset++) {
      const dIso = addDays(todayIso, offset);
      const details = getDayDetails(dIso);
      if (details.dow <= 5 && details.totalClasses > maxClasses) {
        maxClasses = details.totalClasses;
        peakDayIso = dIso;
      }
    }
    if (!peakDayIso || maxClasses <= 0) {
      peakDayIso = addDays(todayIso, (8 - todayDow) % 7 || 7);
    }
    const peakDayDetails = getDayDetails(peakDayIso);
    let peakSubtitle = '';
    if (peakDayDetails.totalClasses > 0) {
      const codes = Array.from(new Set(peakDayDetails.dayCourses.map(c => c.course.code)));
      peakSubtitle = `${peakDayDetails.totalClasses} classes (${codes.join(' + ')})`;
    } else {
      peakSubtitle = 'Light academic week';
    }

    // --- 3. DEEP WORK DAY (Zero-class research & lab focus) ---
    let deepWorkIso = '';
    for (let offset = (todayDetails.totalClasses === 0 && todayDow <= 5 ? 0 : 1); offset <= 10; offset++) {
      const dIso = addDays(todayIso, offset);
      const details = getDayDetails(dIso);
      if (details.dow <= 5 && details.totalClasses === 0 && dIso !== nextLectureIso) {
        deepWorkIso = dIso;
        break;
      }
    }
    if (!deepWorkIso) {
      deepWorkIso = addDays(todayIso, 2);
    }
    const deepWorkDetails = getDayDetails(deepWorkIso);
    let deepWorkSubtitle = '0 classes · Open for Lab & Coding';
    if (deepWorkDetails.dayEvents.length > 0) {
      deepWorkSubtitle = `0 classes · ${deepWorkDetails.dayEvents[0].title}`;
    }

    // --- 4. ADVISOR & MILESTONES (Meetings, Seminars, Critical Deadlines) ---
    let milestoneIso = '';
    let milestoneSubtitle = '';
    for (let offset = 0; offset <= 14; offset++) {
      const dIso = addDays(todayIso, offset);
      const details = getDayDetails(dIso);
      if (details.dayMeetings.length > 0) {
        milestoneIso = dIso;
        milestoneSubtitle = 'Advisor Meeting scheduled';
        break;
      }
      const labMeeting = details.dayEvents.find(e => e.title.toLowerCase().includes('lab') || e.title.toLowerCase().includes('advisor') || e.title.toLowerCase().includes('seminar'));
      if (labMeeting) {
        milestoneIso = dIso;
        milestoneSubtitle = labMeeting.title;
        break;
      }
      const highTask = details.dayTasks.find(t => t.priority === 'high');
      if (highTask) {
        milestoneIso = dIso;
        milestoneSubtitle = `Due: ${highTask.title}`;
        break;
      }
    }
    if (!milestoneIso) {
      milestoneIso = addDays(todayIso, ((12 - todayDow) % 7 || 7));
      const fbDetails = getDayDetails(milestoneIso);
      milestoneSubtitle = fbDetails.dayCourses.length > 0 ? `${fbDetails.dayCourses.map(c => c.course.code).join(' + ')}` : 'Weekly milestone review';
    }
    const milestoneDetails = getDayDetails(milestoneIso);

    return [
      {
        id: 'next_lecture',
        label: 'Next Lecture',
        tag: 'Classroom',
        isoDate: nextLectureIso,
        headerStr: nextLectureDetails.headerStr,
        subtitle: nextLectureSubtitle,
        badgeColor: 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800',
        activeRing: 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-indigo-500/30',
      },
      {
        id: 'peak_day',
        label: 'Peak Class Day',
        tag: 'Heavy Load',
        isoDate: peakDayIso,
        headerStr: peakDayDetails.headerStr,
        subtitle: peakSubtitle,
        badgeColor: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
        activeRing: 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-amber-500/30',
      },
      {
        id: 'deep_work',
        label: 'Deep Work Day',
        tag: 'Focus Day',
        isoDate: deepWorkIso,
        headerStr: deepWorkDetails.headerStr,
        subtitle: deepWorkSubtitle,
        badgeColor: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
        activeRing: 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-emerald-500/30',
      },
      {
        id: 'advisor_milestone',
        label: 'Advisor & Lab',
        tag: 'Milestone',
        isoDate: milestoneIso,
        headerStr: milestoneDetails.headerStr,
        subtitle: milestoneSubtitle,
        badgeColor: 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800',
        activeRing: 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 ring-purple-500/30',
      },
    ];
  }, [courses, events, tasks, advisorMeetings, viewedSemester, simulatedMinutes, timeSlots]);

  return (
    <div className="space-y-4">
      {/* 12-Column Split Layout (Schedule moved directly to top) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 7 Cols: Proportional Calendar Grid */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
          {/* Canvas Card Header with unified controls */}
          <div className="px-3.5 py-2.5 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 sm:hidden shrink-0" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200 hidden sm:inline">
                Schedule Timeline
              </h2>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {dayName} · W{currentAcademicWeek}
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Show off-week classes toggle */}
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={showInactiveCourses}
                  onChange={(e) => setShowInactiveCourses(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-0 w-3.5 h-3.5"
                />
                <span className="hidden sm:inline">Off-week classes</span>
                <span className="sm:hidden">Off-week</span>
              </label>

              <span className="text-slate-200 dark:text-slate-700 hidden sm:inline">|</span>

              {/* Single Non-Duplicate Hours Button */}
              <button
                type="button"
                onClick={() => setIsHoursModalOpen(true)}
                className="text-[10px] font-mono text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 px-2 py-0.5 rounded border border-slate-200/90 dark:border-slate-700 transition flex items-center gap-1.5 shadow-2xs group cursor-pointer"
                title="Click to edit schedule active display hours (e.g. 7 AM – 11 PM)"
              >
                <Clock className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <span>{format12HourTime(startDayMins, false)} – {format12HourTime(endDayMins, false)}</span>
                <Pencil className="w-2.5 h-2.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              </button>

              {!isLiveClock && (
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/90 dark:border-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626]" />
                  <label htmlFor="simTimeSlider" className="text-[10px] font-medium text-slate-600 dark:text-slate-300 tabular-nums">
                    <span className="text-[#dc2626] font-semibold">{sim12hStr}</span>
                  </label>
                  <input
                    id="simTimeSlider"
                    type="range"
                    min="420"
                    max="1380"
                    value={simulatedMinutes}
                    onChange={(e) => setSimulatedMinutes(parseInt(e.target.value, 10))}
                    className="w-16 cursor-pointer"
                    title="Drag to simulate time indicator"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Canvas */}
          <div className="relative bg-white dark:bg-slate-900 select-none overflow-x-hidden" style={{ height: `${totalCanvasHeight}px` }}>
            {/* Vertical axis divider at left gutter */}
            <div
              className="absolute top-0 bottom-0 border-r border-slate-200/90 dark:border-slate-800 pointer-events-none"
              style={{ left: `${LEFT_GUTTER_PX}px` }}
            />

            {/* Hour Grid Lines */}
            {Array.from({ length: Math.max(1, Math.floor(gridEndHour) - gridStartHour + 1) }, (_, idx) => {
              const h = gridStartHour + idx;
              const hourMins = h * 60;
              const yPx = Math.round(TOP_PAD_PX + (hourMins - startDayMins) * PX_PER_MINUTE);
              const isNearIndicator = Math.abs(simulatedMinutes - hourMins) < 14;

              return (
                <React.Fragment key={h}>
                  <div
                    className={`absolute left-0 pr-2 text-right text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 tabular-nums -translate-y-1/2 pointer-events-none transition-opacity ${
                      isNearIndicator ? 'opacity-0' : 'opacity-100'
                    }`}
                    style={{ top: `${yPx}px`, width: `${LEFT_GUTTER_PX}px` }}
                  >
                    {format12HourTime(hourMins, false)}
                  </div>
                  <div
                    className="absolute right-0 border-t border-slate-100 dark:border-slate-800/70 pointer-events-none"
                    style={{ top: `${yPx}px`, left: `${LEFT_GUTTER_PX}px` }}
                  />
                </React.Fragment>
              );
            })}

            {/* Overlap-Aware Timeline Blocks (Courses + Routines + Events) */}
            {layoutItems.map((item) => {
              const topPx = item.topPx;
              const heightPx = item.heightPx;

              // If overlapping, calculate side-by-side column width & offset:
              const isOverlapped = item.totalCols > 1;
              const leftStyle = isOverlapped
                ? `calc(${LEFT_GUTTER_PX + 6}px + (100% - ${LEFT_GUTTER_PX + 16}px) * ${item.colIndex} / ${item.totalCols})`
                : `${LEFT_GUTTER_PX + 6}px`;

              const widthStyle = isOverlapped
                ? `calc((100% - ${LEFT_GUTTER_PX + 16}px) / ${item.totalCols} - 4px)`
                : undefined;

              const rightStyle = isOverlapped ? undefined : '10px';

              // Course item
              if (item.kind === 'course' && item.course) {
                if (item.isWeekActive) {
                  return (
                    <div
                      key={item.id}
                      onClick={() => item.course && setViewingCourse(item.course)}
                      className="absolute z-10 hover:z-20 rounded-lg border px-2.5 py-1.5 transition-all hover:shadow-md calendar-card-hatch overflow-hidden flex flex-col justify-between cursor-pointer"
                      title="Click to view course details"
                      style={{
                        top: `${topPx}px`,
                        height: `${heightPx}px`,
                        left: leftStyle,
                        width: widthStyle,
                        right: rightStyle,
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        borderColor: 'rgba(37, 99, 235, 0.35)',
                      }}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {item.course.name}
                            </span>
                            <span className="text-[10px] font-mono font-medium px-1 py-0.2 rounded bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700 shrink-0">
                              {item.course.code}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {item.totalCols <= 2 && (
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-white/75 dark:bg-slate-800/80 px-1 py-0.2 rounded border border-slate-200/60 dark:border-slate-700 tabular-nums">
                                {Math.floor(item.durationMins / 60)}h {item.durationMins % 60 > 0 ? `${item.durationMins % 60}m` : ''}
                              </span>
                            )}
                            {onEditCourse && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditCourse(item.course!);
                                }}
                                className="p-0.5 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/90 dark:hover:bg-slate-800 transition"
                                title="Edit Course"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400 mt-0.5 tabular-nums">
                          {item.timeDisplay12h}
                        </div>
                        {heightPx >= 48 && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            <span className="font-medium text-slate-700 dark:text-slate-300">Room {item.course.location}</span>
                            {item.schedule && (
                              <>
                                <span>·</span>
                                <span>S{item.schedule.sessions.join('+')}</span>
                              </>
                            )}
                            {item.course.teacher && item.totalCols <= 2 && (
                              <>
                                <span>·</span>
                                <span className="truncate">{item.course.teacher}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // Off-week course
                return (
                  <div
                    key={item.id}
                    className="absolute z-10 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 px-2.5 py-1.5 opacity-65 hover:opacity-95 transition flex items-center justify-between gap-2 overflow-hidden"
                    style={{
                      top: `${topPx}px`,
                      height: `${heightPx}px`,
                      left: leftStyle,
                      width: widthStyle,
                      right: rightStyle,
                    }}
                  >
                    <div className="truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 line-through truncate">
                          {item.course.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">({item.course.code})</span>
                      </div>
                      <div className="text-[10px] text-slate-400 tabular-nums">
                        {item.timeDisplay12h} · Off in W{currentAcademicWeek}
                      </div>
                    </div>
                    {item.totalCols <= 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...item.course!, activeWeeks: [...item.course!.activeWeeks, currentAcademicWeek].sort((a, b) => a - b) };
                          saveCourse(updated);
                        }}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400 transition shrink-0"
                      >
                        + W{currentAcademicWeek}
                      </button>
                    )}
                  </div>
                );
              }

              // Routine or Event item
              if (item.event) {
                const isRoutine = item.kind === 'routine';
                return (
                  <div
                    key={item.id}
                    onClick={() => item.event && setViewingEvent(item.event)}
                    className="absolute z-10 hover:z-20 rounded-lg border transition-all hover:shadow-md cursor-pointer flex flex-col justify-between overflow-hidden p-2 group bg-white/95 dark:bg-slate-800/95"
                    style={{
                      top: `${topPx}px`,
                      height: `${heightPx}px`,
                      left: leftStyle,
                      width: widthStyle,
                      right: rightStyle,
                      borderColor: item.color || (isRoutine ? '#059669' : '#dc2626'),
                      borderStyle: isRoutine ? 'dashed' : 'solid',
                      borderLeftWidth: '3.5px',
                      backgroundColor: isRoutine ? 'rgba(5, 150, 105, 0.05)' : 'rgba(220, 38, 38, 0.05)',
                    }}
                    title={`Click to view ${isRoutine ? 'routine' : 'event'} details`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="shrink-0 flex items-center">
                            {isRoutine ? (
                              <Twemoji emoji="🔁" className="w-3.5 h-3.5" />
                            ) : (
                              <Twemoji emoji="📅" className="w-3.5 h-3.5" />
                            )}
                          </span>
                          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {item.title}
                          </span>
                        </div>
                        {onEditEvent && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditEvent(item.event!);
                            }}
                            className="p-0.5 rounded text-slate-400 hover:text-indigo-600 transition"
                            title="Edit Commitment"
                          >
                            <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition shrink-0" />
                          </button>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums truncate">
                        {item.timeDisplay12h}
                        {item.location && heightPx >= 44 && ` · ${item.location}`}
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })}

            {/* Empty Note */}
            {layoutItems.length === 0 && (
              <div className="absolute inset-x-0 top-12 flex justify-center pointer-events-none z-10">
                <div className="px-3 py-1.5 rounded-lg bg-slate-50/90 dark:bg-slate-800/90 border border-dashed border-slate-200 dark:border-slate-700 text-center">
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    No classes or commitments scheduled on {dayName} (Week {currentAcademicWeek})
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Schedule runs {format12HourTime(startDayMins, false)} – {format12HourTime(endDayMins, false)}
                  </div>
                </div>
              </div>
            )}

            {/* Red Current-Time Indicator */}
            {simulatedMinutes >= startDayMins && simulatedMinutes <= endDayMins && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: `${Math.round(TOP_PAD_PX + (simulatedMinutes - startDayMins) * PX_PER_MINUTE)}px` }}
              >
                <div
                  className="absolute right-0 border-t-2 border-[#dc2626]"
                  style={{ left: `${LEFT_GUTTER_PX}px` }}
                />
                <div
                  className="absolute -top-[5px] w-2.5 h-2.5 rounded-full bg-[#dc2626] border-2 border-white dark:border-slate-900"
                  style={{ left: `${LEFT_GUTTER_PX - 5}px` }}
                />
                <div
                  className="absolute -top-[10px] left-0 pr-2 text-right text-[11px] font-mono font-bold text-[#dc2626] tabular-nums"
                  style={{ width: `${LEFT_GUTTER_PX}px` }}
                >
                  {sim12hStr}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Cols: Tasks & Routines Overview */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Today's Tasks */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="px-3.5 py-2 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Tasks Due Today</h2>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">({tasksForDay.length})</span>
              </div>
              <button
                type="button"
                onClick={onOpenTaskModal}
                className="text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>New Task</span>
              </button>
            </div>

            <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto">
              {tasksForDay.length === 0 ? (
                <div className="py-4 text-center rounded border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-400">No tasks due on this date.</p>
                  <button
                    type="button"
                    onClick={onOpenTaskModal}
                    className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white mt-1"
                  >
                    + Add task
                  </button>
                </div>
              ) : (
                tasksForDay.map(task => {
                  const isDone = task.status === 'completed';
                  return (
                    <div
                      key={task.id}
                      className={`px-2.5 py-1.5 rounded-md border transition flex items-start justify-between gap-2.5 ${
                        isDone
                          ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 opacity-60'
                          : 'bg-white dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <label className="flex items-start gap-2 cursor-pointer select-none flex-1">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={(e) => {
                            saveTask({ ...task, status: e.target.checked ? 'completed' : 'in_progress' });
                          }}
                          className="mt-0.5 w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-slate-900 focus:ring-0 cursor-pointer"
                        />
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className={`text-xs font-medium truncate ${isDone ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {task.title}
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {task.tags.map(t => (
                              <span key={t} className="px-1 py-0.2 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-600">
                                {t}
                              </span>
                            ))}
                            <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                              {task.dueDate}
                            </span>
                          </div>
                        </div>
                      </label>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Today's Routines & Events Card (View & Edit, Add is managed in Timetable view) */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="px-3.5 py-2.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Routines & Events
                </h2>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  ({todayEvents.length})
                </span>
              </div>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                Managed in Timetable
              </span>
            </div>

            <div className="p-3 space-y-1.5">
              {todayEvents.length === 0 ? (
                <div className="py-3 text-center rounded border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-400">No routines or events scheduled for this day.</p>
                </div>
              ) : (
                todayEvents.map(({ event: ev, timeDisplay12h }) => (
                  <div
                    key={ev.id}
                    onClick={() => setViewingEvent(ev)}
                    className="p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:border-slate-400 transition flex items-start justify-between gap-2"
                    style={{ borderLeftWidth: '3px', borderLeftColor: ev.color }}
                    title="Click to view details"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="shrink-0 flex items-center">
                          {ev.type === 'routine' ? (
                            <Twemoji emoji="🔁" className="w-3.5 h-3.5" />
                          ) : (
                            <Twemoji emoji="📅" className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {ev.title}
                        </span>
                        <span className={`text-[9px] font-mono uppercase px-1 rounded ${
                          ev.type === 'routine'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                        }`}>
                          {ev.type}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <span>{timeDisplay12h}</span>
                        {ev.location && (
                          <>
                            <span>·</span>
                            <Twemoji emoji="📍" className="w-3 h-3" />
                            <span>{ev.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {onEditEvent && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditEvent(ev);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 transition"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dynamic Quick Scenarios */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-800 p-3 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Quick Scenarios</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Live
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Week {currentAcademicWeek}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickScenarios.map(sc => {
                const isSelected = sc.isoDate === selectedDate;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setSelectedDate(sc.isoDate)}
                    className={`text-left p-2 rounded-lg border transition flex flex-col justify-between gap-1 group relative ${
                      isSelected
                        ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-500/30'
                        : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50/90 dark:hover:bg-slate-800/80'
                    }`}
                    title={`Jump to ${sc.headerStr} (${sc.subtitle})`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${sc.badgeColor}`}>
                        {sc.label}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {sc.tag && (
                          <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">
                            {sc.tag}
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-0.5">
                      {sc.headerStr}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full" title={sc.subtitle}>
                      {sc.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Course Details Modal */}
      <CourseDetailsModal
        course={viewingCourse}
        isOpen={!!viewingCourse}
        onClose={() => setViewingCourse(null)}
        onEdit={(c) => {
          setViewingCourse(null);
          if (onEditCourse) onEditCourse(c);
        }}
        timeSlots={timeSlots}
        currentAcademicWeek={currentAcademicWeek}
        totalWeeks={viewedSemester.totalWeeks}
        tasks={tasks}
      />

      {/* Routine & Event Details Modal */}
      <EventDetailsModal
        event={viewingEvent}
        isOpen={!!viewingEvent}
        onClose={() => setViewingEvent(null)}
        onEdit={(ev) => {
          setViewingEvent(null);
          if (onEditEvent) onEditEvent(ev);
        }}
        currentAcademicWeek={currentAcademicWeek}
      />

      {/* Schedule Hours Configuration Modal */}
      <ScheduleHoursModal
        isOpen={isHoursModalOpen}
        onClose={() => setIsHoursModalOpen(false)}
        startHour={scheduleStartHour}
        endHour={scheduleEndHour}
        onSave={(newStart, newEnd) => {
          setScheduleStartHour(newStart);
          setScheduleEndHour(newEnd);
          showToast(`Schedule hours set to ${format12HourTime(newStart * 60, false)} – ${format12HourTime(newEnd * 60, false)}`);
        }}
      />
    </div>
  );
};
