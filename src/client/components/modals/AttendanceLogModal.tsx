import React, { useState, useMemo } from 'react';
import { useWorkspace, formatHumanDate, getTodayIsoDate, parseIsoDate } from '../../hooks/useWorkspace';
import { ModalSheet } from '../common/ModalSheet';
import { Twemoji } from '../common/Twemoji';
import {
  CheckCircle2,
  Calendar,
  Clock,
  Flame,
  AlertCircle,
  BookOpen,
  Repeat,
  Check,
  X,
  Minus,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import { CommitmentStatus } from '../../../types';

interface AttendanceLogModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
}

type FilterView = 'missed' | 'courses' | 'routines' | 'all';

export const AttendanceLogModal: React.FC<AttendanceLogModalProps> = ({
  ws,
  isOpen,
  onClose,
}) => {
  const {
    courses,
    events,
    attendanceRecords,
    setAttendanceStatus,
    getCourseAttendanceStats,
    getRoutineAttendanceStats,
    viewedSemester,
    currentAcademicWeek,
  } = ws;

  const [activeFilter, setActiveFilter] = useState<FilterView>('missed');
  const [expandedTargetId, setExpandedTargetId] = useState<string | null>(null);

  // Overall Course Stats
  const courseRecords = useMemo(
    () => attendanceRecords.filter((r) => r.targetType === 'course'),
    [attendanceRecords]
  );
  const courseAttended = courseRecords.filter((r) => r.status === 'attended').length;
  const courseMissed = courseRecords.filter((r) => r.status === 'missed').length;
  const courseExcused = courseRecords.filter((r) => r.status === 'excused').length;
  const courseEvaluated = courseAttended + courseMissed;
  const overallCourseRate = courseEvaluated > 0 ? Math.round((courseAttended / courseEvaluated) * 100) : 100;

  // Overall Routine Stats
  const routineRecords = useMemo(
    () => attendanceRecords.filter((r) => r.targetType === 'routine' || r.targetType === 'event'),
    [attendanceRecords]
  );
  const routineAttended = routineRecords.filter((r) => r.status === 'attended').length;
  const routineMissed = routineRecords.filter((r) => r.status === 'missed').length;
  const routineExcused = routineRecords.filter((r) => r.status === 'excused').length;
  const routineEvaluated = routineAttended + routineMissed;
  const overallRoutineRate = routineEvaluated > 0 ? Math.round((routineAttended / routineEvaluated) * 100) : 100;

  // Missed course sessions list
  const missedClasses = useMemo(() => {
    return courseRecords
      .filter((r) => r.status === 'missed')
      .map((r) => {
        const course = courses.find((c) => c.id === r.targetId);
        return {
          record: r,
          course,
        };
      })
      .sort((a, b) => b.record.date.localeCompare(a.record.date));
  }, [courseRecords, courses]);

  // Active streak calculation (consecutive days with all logged commitments attended)
  const streakDays = useMemo(() => {
    const datesMap = new Map<string, { total: number; attended: number; missed: number }>();
    attendanceRecords.forEach((r) => {
      const cur = datesMap.get(r.date) || { total: 0, attended: 0, missed: 0 };
      cur.total++;
      if (r.status === 'attended') cur.attended++;
      if (r.status === 'missed') cur.missed++;
      datesMap.set(r.date, cur);
    });

    const sortedDates = Array.from(datesMap.keys()).sort((a, b) => b.localeCompare(a));
    let streak = 0;
    for (const d of sortedDates) {
      const stats = datesMap.get(d)!;
      if (stats.missed === 0 && stats.attended > 0) {
        streak++;
      } else if (stats.missed > 0) {
        break;
      }
    }
    return streak;
  }, [attendanceRecords]);

  // Reverse-chronological activity log
  const sortedRecords = useMemo(() => {
    return attendanceRecords.slice().sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceRecords]);

  // Routines list
  const activeRoutines = useMemo(() => {
    return events.filter((e) => e.type === 'routine');
  }, [events]);

  const toggleExpand = (targetId: string) => {
    setExpandedTargetId((prev) => (prev === targetId ? null : targetId));
  };

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-2xl">
      {({ requestClose, dragHandleProps }) => (
        <>
          {/* Header Bar */}
          <div
            {...dragHandleProps}
            className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-white dark:bg-slate-900 shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
          >
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Accountability
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                  {viewedSemester.name}
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-snug flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Attendance & Routine Log</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track consistency, review past class presence, and catch up on missed sessions
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
            {/* KPI Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Course Attendance */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                  <BookOpen className="w-3 h-3 text-blue-500" />
                  <span>Class Rate</span>
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                  {overallCourseRate}%
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {courseAttended} of {courseEvaluated} classes
                </div>
              </div>

              {/* Routine Completion */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                  <Repeat className="w-3 h-3 text-emerald-500" />
                  <span>Routines Rate</span>
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                  {overallRoutineRate}%
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {routineAttended} of {routineEvaluated} sessions
                </div>
              </div>

              {/* Active Streak */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                  <Flame className="w-3 h-3 text-amber-500" />
                  <span>Commitment Streak</span>
                </div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono flex items-center gap-1">
                  <span>{streakDays}</span>
                  <span className="text-xs font-normal text-slate-400 font-sans">days</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {streakDays > 0 ? 'Consistency on track 🔥' : 'Start streak today'}
                </div>
              </div>

              {/* Missed Catch-up Needed */}
              <div
                onClick={() => setActiveFilter('missed')}
                className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                  missedClasses.length > 0
                    ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 hover:border-rose-300'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850'
                }`}
              >
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                  <AlertCircle className={`w-3 h-3 ${missedClasses.length > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
                  <span>Missed Classes</span>
                </div>
                <div className={`text-lg font-bold font-mono ${missedClasses.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                  {missedClasses.length}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {missedClasses.length > 0 ? 'Need notes / review' : 'All classes attended ✨'}
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto custom-scrollbar">
              <button
                type="button"
                onClick={() => setActiveFilter('missed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeFilter === 'missed'
                    ? 'bg-rose-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Missed Catch-up</span>
                {missedClasses.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    activeFilter === 'missed' ? 'bg-white text-rose-700' : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  }`}>
                    {missedClasses.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('courses')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeFilter === 'courses'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Courses Breakdown</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('routines')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeFilter === 'routines'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>Routines & Habits</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>All Logs ({attendanceRecords.length})</span>
              </button>
            </div>

            {/* View 1: Missed Classes Catch-Up List */}
            {activeFilter === 'missed' && (
              <div className="space-y-3">
                {missedClasses.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-emerald-50/30 dark:bg-emerald-950/20">
                    <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-300 mb-2.5">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Zero Missed Classes!
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      You have attended or excused every course session so far. No lecture notes or catch-up materials pending!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Missed Sessions Requiring Review ({missedClasses.length})</span>
                      <span className="text-[10px] text-slate-400 font-normal">Click action when caught up</span>
                    </div>

                    {missedClasses.map(({ record, course }) => (
                      <div
                        key={record.id}
                        className="p-3.5 rounded-xl border border-rose-200/90 dark:border-rose-900/60 bg-white dark:bg-slate-850 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                              {course?.code || 'COURSE'}
                            </span>
                            <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {formatHumanDate(record.date)}
                            </span>
                            {record.academicWeek && (
                              <span className="text-[10px] font-mono text-slate-400">
                                · Week {record.academicWeek}
                              </span>
                            )}
                          </div>
                          <div className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                            {course?.name || 'Class Session'}
                          </div>
                          {record.note && (
                            <div className="text-[11px] text-slate-500 italic">
                              "{record.note}"
                            </div>
                          )}
                        </div>

                        {/* Quick Catch-up Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setAttendanceStatus(
                                record.targetId,
                                'course',
                                record.date,
                                'attended',
                                'Caught up on lecture notes/recording',
                                record.academicWeek
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="Mark as Caught Up (Attended)"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Caught Up</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setAttendanceStatus(
                                record.targetId,
                                'course',
                                record.date,
                                'excused',
                                'Excused absence',
                                record.academicWeek
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1 cursor-pointer"
                            title="Mark as Excused"
                          >
                            <Minus className="w-3.5 h-3.5" />
                            <span>Excused</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* View 2: Courses Breakdown */}
            {activeFilter === 'courses' && (
              <div className="space-y-3">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Course-by-Course Attendance Rates
                </div>

                <div className="space-y-2">
                  {courses.map((c) => {
                    const stats = getCourseAttendanceStats(c.id);
                    const isExpanded = expandedTargetId === c.id;
                    const total = Math.max(1, stats.attended + stats.missed + stats.excused);
                    const attendedPct = (stats.attended / total) * 100;
                    const missedPct = (stats.missed / total) * 100;
                    const excusedPct = (stats.excused / total) * 100;

                    return (
                      <div
                        key={c.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-3.5 shadow-2xs space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: c.color || '#2563eb' }}
                            />
                            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              {c.code}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                              {c.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                              {stats.ratePercent}% Attendance
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleExpand(c.id)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                              title={isExpanded ? 'Hide history' : 'Show history'}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="space-y-1">
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                            <div style={{ width: `${attendedPct}%` }} className="bg-emerald-500 h-full" title={`${stats.attended} Attended`} />
                            <div style={{ width: `${missedPct}%` }} className="bg-rose-500 h-full" title={`${stats.missed} Missed`} />
                            <div style={{ width: `${excusedPct}%` }} className="bg-slate-400 h-full" title={`${stats.excused} Excused`} />
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                              {stats.attended} Attended
                            </span>
                            <span className="text-rose-600 dark:text-rose-400 font-medium">
                              {stats.missed} Missed
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {stats.excused} Excused
                            </span>
                          </div>
                        </div>

                        {/* Expanded Sessions History */}
                        {isExpanded && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                              Session Log ({stats.records.length})
                            </div>
                            {stats.records.length === 0 ? (
                              <div className="text-[11px] text-slate-400 italic py-1">
                                No sessions logged yet for this course. Check-in directly from the schedule timeline!
                              </div>
                            ) : (
                              <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                {stats.records
                                  .slice()
                                  .sort((a, b) => b.date.localeCompare(a.date))
                                  .map((r) => (
                                    <div
                                      key={r.id}
                                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between text-[11px]"
                                    >
                                      <div className="flex items-center gap-2 font-mono">
                                        <span className="text-slate-900 dark:text-white font-medium">{formatHumanDate(r.date)}</span>
                                        {r.academicWeek && <span className="text-slate-400">W{r.academicWeek}</span>}
                                        {r.note && <span className="text-slate-400 italic font-sans truncate max-w-xs">({r.note})</span>}
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                          r.status === 'attended'
                                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300'
                                            : r.status === 'missed'
                                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-300'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300'
                                        }`}>
                                          {r.status === 'attended' ? '✓ Attended' : r.status === 'missed' ? '✕ Missed' : '— Excused'}
                                        </span>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            const next: CommitmentStatus | null =
                                              r.status === 'attended' ? 'missed' : r.status === 'missed' ? 'excused' : 'attended';
                                            setAttendanceStatus(c.id, 'course', r.date, next, undefined, r.academicWeek);
                                          }}
                                          className="text-[9px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
                                        >
                                          Change
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* View 3: Routines Breakdown */}
            {activeFilter === 'routines' && (
              <div className="space-y-3">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Recurring Routine & Habit Consistency
                </div>

                {activeRoutines.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850">
                    <p className="text-xs text-slate-500">
                      No routines configured. Add routines like gym, office hours, or lab review from the schedule!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeRoutines.map((routine) => {
                      const stats = getRoutineAttendanceStats(routine.id);
                      const isExpanded = expandedTargetId === routine.id;
                      const total = Math.max(1, stats.attended + stats.missed + stats.excused);
                      const attendedPct = (stats.attended / total) * 100;
                      const missedPct = (stats.missed / total) * 100;
                      const excusedPct = (stats.excused / total) * 100;

                      return (
                        <div
                          key={routine.id}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-3.5 shadow-2xs space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 truncate">
                              <Twemoji emoji="🔁" className="w-4 h-4 shrink-0" />
                              <span className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                                {routine.title}
                              </span>
                              {routine.category && (
                                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  {routine.category}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                {stats.ratePercent}% Done
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleExpand(routine.id)}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                                title={isExpanded ? 'Hide history' : 'Show history'}
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1">
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                              <div style={{ width: `${attendedPct}%` }} className="bg-emerald-500 h-full" title={`${stats.attended} Done`} />
                              <div style={{ width: `${missedPct}%` }} className="bg-rose-500 h-full" title={`${stats.missed} Missed`} />
                              <div style={{ width: `${excusedPct}%` }} className="bg-slate-400 h-full" title={`${stats.excused} Skipped`} />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                {stats.attended} Completed
                              </span>
                              <span className="text-rose-600 dark:text-rose-400 font-medium">
                                {stats.missed} Missed
                              </span>
                              <span className="text-slate-500 dark:text-slate-400">
                                {stats.excused} Skipped
                              </span>
                            </div>
                          </div>

                          {/* Expanded History */}
                          {isExpanded && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                                Check-in Log ({stats.records.length})
                              </div>
                              {stats.records.length === 0 ? (
                                <div className="text-[11px] text-slate-400 italic py-1">
                                  No check-ins logged yet for this routine.
                                </div>
                              ) : (
                                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                  {stats.records
                                    .slice()
                                    .sort((a, b) => b.date.localeCompare(a.date))
                                    .map((r) => (
                                      <div
                                        key={r.id}
                                        className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between text-[11px]"
                                      >
                                        <div className="flex items-center gap-2 font-mono">
                                          <span className="text-slate-900 dark:text-white font-medium">{formatHumanDate(r.date)}</span>
                                          {r.academicWeek && <span className="text-slate-400">W{r.academicWeek}</span>}
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                            r.status === 'attended'
                                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300'
                                              : r.status === 'missed'
                                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-300'
                                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300'
                                          }`}>
                                            {r.status === 'attended' ? '✓ Done' : r.status === 'missed' ? '✕ Missed' : '— Skipped'}
                                          </span>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              const next: CommitmentStatus | null =
                                                r.status === 'attended' ? 'missed' : r.status === 'missed' ? 'excused' : 'attended';
                                              setAttendanceStatus(routine.id, 'routine', r.date, next, undefined, r.academicWeek);
                                            }}
                                            className="text-[9px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
                                          >
                                            Change
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* View 4: All Records Timeline */}
            {activeFilter === 'all' && (
              <div className="space-y-3">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Reverse Chronological Log ({sortedRecords.length})</span>
                  <span className="text-[10px] text-slate-400 font-normal">All checked sessions</span>
                </div>

                {sortedRecords.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850">
                    <p className="text-xs text-slate-500">No attendance records logged yet.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {sortedRecords.map((r) => {
                      const course = r.targetType === 'course' ? courses.find((c) => c.id === r.targetId) : undefined;
                      const event = r.targetType !== 'course' ? events.find((e) => e.id === r.targetId) : undefined;
                      const title = course ? `${course.code} · ${course.name}` : event ? event.title : r.targetId;

                      return (
                        <div
                          key={r.id}
                          className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {formatHumanDate(r.date)}
                              </span>
                              {r.academicWeek && <span>· W{r.academicWeek}</span>}
                              <span className="uppercase text-[9px] px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                {r.targetType}
                              </span>
                            </div>
                            <div className="font-semibold text-slate-900 dark:text-white truncate">
                              {title}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                              r.status === 'attended'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300'
                                : r.status === 'missed'
                                ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-300'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300'
                            }`}>
                              {r.status === 'attended' ? '✓ Attended / Done' : r.status === 'missed' ? '✕ Missed' : '— Excused'}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                const next: CommitmentStatus | null =
                                  r.status === 'attended' ? 'missed' : r.status === 'missed' ? 'excused' : 'attended';
                                setAttendanceStatus(r.targetId, r.targetType, r.date, next, undefined, r.academicWeek);
                              }}
                              className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
                            >
                              Change
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] sm:pb-3.5 sm:px-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs shrink-0 z-10">
            <span className="text-[10px] font-mono text-slate-400">
              Total Check-in Records: {attendanceRecords.length}
            </span>

            <button
              type="button"
              onClick={requestClose}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 transition shadow-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </>
      )}
    </ModalSheet>
  );
};
