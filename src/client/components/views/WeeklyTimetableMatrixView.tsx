import React, { useState } from 'react';
import { useWorkspace, DAY_NAMES_SHORT, timeToMinutes, addDays, getTodayIsoDate } from '../../hooks/useWorkspace';
import { Plus, Trash2, Pencil, Sparkles, BellRing, Calendar, Clock } from 'lucide-react';
import { Course, ScheduleEvent } from '../../../types';
import { Twemoji } from '../common/Twemoji';
import { CourseDetailsModal } from '../modals/CourseDetailsModal';
import { EventDetailsModal } from '../modals/EventDetailsModal';

interface WeeklyTimetableMatrixViewProps {
  ws: ReturnType<typeof useWorkspace>;
  onOpenCourseModal: () => void;
  onOpenTimeSlotsModal: () => void;
  onEditCourse: (course: Course) => void;
  onOpenEventModal?: () => void;
  onEditEvent?: (event: ScheduleEvent) => void;
  onOpenAiImportModal?: () => void;
  onOpenRemindersModal?: () => void;
}

export const WeeklyTimetableMatrixView: React.FC<WeeklyTimetableMatrixViewProps> = ({
  ws,
  onOpenCourseModal,
  onOpenTimeSlotsModal,
  onEditCourse,
  onOpenEventModal,
  onEditEvent,
  onOpenAiImportModal,
  onOpenRemindersModal,
}) => {
  const {
    viewedSemester,
    currentAcademicWeek,
    courses,
    events,
    timeSlots,
    showRoutines,
    setShowRoutines,
    showEvents,
    setShowEvents,
    showWeekend,
    setShowWeekend,
    tasks,
    saveCourse,
    deleteCourse,
    deleteEvent,
  } = ws;

  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);
  const [viewingEvent, setViewingEvent] = useState<ScheduleEvent | null>(null);

  const semCourses = courses.filter((c) => c.semesterId === viewedSemester.id);
  const semEvents = (events || []).filter((e) => e.semesterId === viewedSemester.id);
  const isArchived = viewedSemester.isArchived || !viewedSemester.isActive;

  const daysToDisplay = showWeekend ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5];

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

  // Find events matching a specific cell
  const getSlotEvents = (day: number, sessionLabel: string, slotStart: string, slotEnd: string) => {
    const cellIso = addDays(viewedSemester.startDate, (currentAcademicWeek - 1) * 7 + (day - 1));
    const slotStartM = timeToMinutes(slotStart);
    const slotEndM = timeToMinutes(slotEnd);

    return semEvents.filter((ev) => {
      // Filter toggles
      if (ev.type === 'routine' && !showRoutines) return false;
      if (ev.type === 'event' && !showEvents) return false;

      // Day & Active week check
      if (ev.type === 'routine') {
        const days = (ev.daysOfWeek || []).map(Number);
        if (!days.includes(day)) return false;
        if (ev.activeWeeks && ev.activeWeeks.length > 0 && !ev.activeWeeks.map(Number).includes(currentAcademicWeek)) return false;
      } else if (ev.type === 'event') {
        if (ev.specificDate !== cellIso) return false;
      }

      // Check session snap or time range
      if (ev.sessions && ev.sessions.length > 0) {
        return ev.sessions.includes(sessionLabel);
      }

      const evStartM = timeToMinutes(ev.startTime);
      // If earlier than first session (e.g. 07:00 AM gym), place in first session slot
      if (sessionLabel === timeSlots[0]?.session && evStartM < slotStartM) {
        return true;
      }
      // If later than last session, place in last session slot
      if (sessionLabel === timeSlots[timeSlots.length - 1]?.session && evStartM >= slotStartM) {
        return true;
      }
      return evStartM >= slotStartM && evStartM < slotEndM;
    });
  };

  const slotCount = timeSlots.length;
  const skipMatrix: Record<string, boolean> = {};

  return (
    <div className="space-y-6">
      {/* Weekly Timetable Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Header Title + Badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Weekly Timetable
            </h2>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 hidden sm:inline-block">
              Week {currentAcademicWeek}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hidden sm:inline-block">
              {viewedSemester.name}
            </span>

            {/* Weekend 5-Day vs 7-Day Toggle */}
            <button
              type="button"
              onClick={() => setShowWeekend(!showWeekend)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium border transition ${
                showWeekend
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
              title="Toggle weekend columns (Saturday & Sunday)"
            >
              {showWeekend ? '7-Day View' : '5-Day View'}
            </button>

            {/* Filter checkboxes */}
            <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-700">
              <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showRoutines}
                  onChange={(e) => setShowRoutines(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                />
                <span>Routines</span>
              </label>
              <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showEvents}
                  onChange={(e) => setShowEvents(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                />
                <span>Events</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenAiImportModal && (
              <button
                type="button"
                onClick={onOpenAiImportModal}
                className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-medium transition flex items-center gap-1.5 shadow-2xs"
                title="Extract and import timetable with AI"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>AI Import</span>
              </button>
            )}
            {onOpenRemindersModal && (
              <button
                type="button"
                onClick={onOpenRemindersModal}
                className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium transition flex items-center gap-1.5"
                title="Class reminders & calendar sync"
              >
                <BellRing className="w-3.5 h-3.5 text-indigo-500" />
                <span>Reminders</span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenTimeSlotsModal}
              className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium transition"
            >
              Slots
            </button>
            {onOpenEventModal && (
              <button
                type="button"
                onClick={onOpenEventModal}
                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition flex items-center gap-1 shadow-2xs"
                title="Add a recurring routine habit or one-off event"
              >
                <Plus className="w-3 h-3" />
                <span>Routine/Event</span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenCourseModal}
              className="px-2.5 py-1 rounded bg-slate-900 dark:bg-white hover:bg-slate-800 text-white dark:text-slate-900 text-xs font-medium transition flex items-center gap-1 shadow-2xs"
            >
              <Plus className="w-3 h-3" />
              <span>Course</span>
            </button>
          </div>
        </div>

        {/* Timetable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">
                <th className="py-1.5 px-2.5 w-24 border-r border-slate-200 dark:border-slate-800 font-medium">Session</th>
                {daysToDisplay.map((day, dIdx) => {
                  const cellIso = addDays(viewedSemester.startDate, (currentAcademicWeek - 1) * 7 + (day - 1));
                  const [, m, d] = cellIso.split('-');
                  const todayIso = getTodayIsoDate();
                  const isToday = cellIso === todayIso;
                  const isWeekend = day >= 6;

                  return (
                    <th
                      key={day}
                      className={`py-1.5 px-2.5 font-medium ${
                        dIdx < daysToDisplay.length - 1 ? 'border-r border-slate-200 dark:border-slate-800' : ''
                      } ${isWeekend ? 'bg-slate-100/40 dark:bg-slate-800/60' : ''} ${
                        isToday ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{DAY_NAMES_SHORT[day]}</span>
                        <span className="font-normal text-[9px] text-slate-400 tabular-nums">
                          {Number(m)}/{Number(d)}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {timeSlots.map((slot, r) => {
                return (
                  <tr key={slot.session}>
                    <td className="py-2 px-2.5 bg-slate-50/50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-800 align-top">
                      <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        S{slot.session}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 mt-0.5 tabular-nums">
                        {slot.startTime}–{slot.endTime}
                      </div>
                    </td>

                    {daysToDisplay.map((day, dIdx) => {
                      if (skipMatrix[`${r}_${day}`]) return null;

                      let matchedCourse: Course | null = null;
                      let matchedSched: Course['schedules'][0] | null = null;
                      let spanCount = 1;

                      for (const c of semCourses) {
                        for (const sch of c.schedules) {
                          if (Number(sch.dayOfWeek) === day && sch.sessions[0] === slot.session) {
                            matchedCourse = c;
                            matchedSched = sch;
                            let k = 1;
                            while (r + k < slotCount && sch.sessions.includes(timeSlots[r + k].session)) {
                              skipMatrix[`${r + k}_${day}`] = true;
                              k++;
                            }
                            spanCount = k;
                            break;
                          }
                        }
                        if (matchedCourse) break;
                      }

                      // Find matching routines / events for this slot
                      const slotEvents = getSlotEvents(day, slot.session, slot.startTime, slot.endTime);
                      const hasContent = (matchedCourse && matchedSched) || slotEvents.length > 0;
                      const isWeekend = day >= 6;

                      return (
                        <td
                          key={day}
                          rowSpan={spanCount > 1 ? spanCount : undefined}
                          className={`p-1 align-top ${
                            dIdx < daysToDisplay.length - 1 ? 'border-r border-slate-200 dark:border-slate-800' : ''
                          } ${isWeekend ? 'bg-slate-50/30 dark:bg-slate-900/40' : ''}`}
                        >
                          {hasContent ? (
                            <div className="space-y-1.5 h-full">
                              {/* 1. Course Card */}
                              {matchedCourse && matchedSched && (() => {
                                const isWeekActive = matchedCourse.activeWeeks.includes(currentAcademicWeek);
                                const bounds = computeMergedSessionBounds(matchedSched.sessions);
                                return (
                                  <div
                                    onClick={() => setViewingCourse(matchedCourse)}
                                    className={`p-2 rounded-md border transition border-l-[3px] cursor-pointer hover:shadow-xs ${
                                      isWeekActive
                                        ? 'bg-slate-50/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                                        : 'bg-slate-50/30 dark:bg-slate-800/30 text-slate-400 border-dashed border-slate-200 dark:border-slate-700 opacity-60'
                                    }`}
                                    style={{ borderLeftColor: isWeekActive ? matchedCourse.color : '#94a3b8' }}
                                    title="Click to view course details"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-mono text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                        {matchedCourse.code}
                                      </span>
                                      <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                                        {bounds.startTime}–{bounds.endTime}
                                      </span>
                                    </div>
                                    <div className="font-semibold text-xs mt-0.5 leading-tight">
                                      {matchedCourse.name}
                                    </div>
                                    <div className="text-[10px] mt-0.5 text-slate-500 dark:text-slate-400">
                                      {matchedCourse.location} {matchedCourse.teacher ? `· ${matchedCourse.teacher}` : ''}
                                    </div>
                                    <div className="mt-1.5 pt-1 border-t border-slate-200/70 dark:border-slate-700 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                                      <span>S{matchedSched.sessions.join('+')}</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!isArchived) onEditCourse(matchedCourse);
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
                                        title="Edit Course"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* 2. Routines & Events Cards */}
                              {slotEvents.map((ev) => {
                                const isRoutine = ev.type === 'routine';
                                return (
                                  <div
                                    key={ev.id}
                                    onClick={() => setViewingEvent(ev)}
                                    className="p-2 rounded-md border border-dashed transition cursor-pointer hover:shadow-xs bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                                    style={{
                                      borderLeftWidth: '3px',
                                      borderLeftStyle: 'solid',
                                      borderLeftColor: ev.color || '#6366F1',
                                    }}
                                    title={`Click to view ${isRoutine ? 'routine' : 'event'} details`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase font-semibold px-1 py-0.2 rounded ${
                                        isRoutine
                                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                                          : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                                      }`}>
                                        <Twemoji emoji={isRoutine ? '🔁' : '📅'} className="w-3 h-3" />
                                        <span>{isRoutine ? 'Routine' : 'Event'}</span>
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                                          {ev.startTime}–{ev.endTime}
                                        </span>
                                        {onEditEvent && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onEditEvent(ev);
                                            }}
                                            className="p-0.5 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                                            title="Edit Commitment"
                                          >
                                            <Pencil className="w-2.5 h-2.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    <div className="font-semibold text-xs mt-1 leading-tight text-slate-900 dark:text-white">
                                      {ev.title}
                                    </div>
                                    {ev.location && (
                                      <div className="text-[10px] mt-0.5 text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                                        <Twemoji emoji="📍" className="w-2.5 h-2.5" />
                                        <span>{ev.location}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="h-8" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Directory & Management Section */}
      <div className="space-y-6">
        {/* 1. Routines & Events Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Routines & Events ({semEvents.length})
              </h3>
              <span className="text-[11px] text-slate-400">
                Habits, study blocks & one-off academic milestones
              </span>
            </div>
            {onOpenEventModal && (
              <button
                type="button"
                onClick={onOpenEventModal}
                className="px-2.5 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Commitment</span>
              </button>
            )}
          </div>

          {semEvents.length === 0 ? (
            <div className="p-6 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-900/40">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No routines or events added yet. Add regular study blocks, gym workouts, or one-off exams to your schedule.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {semEvents.map((ev) => {
                const isRoutine = ev.type === 'routine';
                return (
                  <div
                    key={ev.id}
                    onClick={() => setViewingEvent(ev)}
                    className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between shadow-xs cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 transition"
                    style={{ borderLeftWidth: '3px', borderLeftColor: ev.color }}
                    title="Click to view details"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-medium ${
                              isRoutine
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                            }`}>
                              <Twemoji emoji={isRoutine ? '🔁' : '📅'} className="w-3 h-3" />
                              <span>{isRoutine ? 'Routine' : 'Event'}</span>
                            </span>
                            {ev.category && (
                              <span className="text-[10px] font-mono text-slate-400">
                                {ev.category}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-semibold text-slate-900 dark:text-white mt-1">
                            {ev.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-0.5">
                          {onEditEvent && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditEvent(ev);
                              }}
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded transition"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteEvent(ev.id);
                            }}
                            className="text-slate-300 hover:text-rose-600 p-1 rounded transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                        <div className="font-mono text-[10px] flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {isRoutine
                              ? ev.daysOfWeek.map((d) => DAY_NAMES_SHORT[d]).join(', ')
                              : ev.specificDate}{' '}
                            · {ev.startTime}–{ev.endTime}
                          </span>
                        </div>
                        {ev.location && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Twemoji emoji="📍" className="w-2.5 h-2.5" />
                            <span>{ev.location}</span>
                          </div>
                        )}
                        {ev.notes && (
                          <div className="text-[10px] text-slate-400 italic">
                            "{ev.notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Course Directory & 1-19 Week Active Matrix */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Course Directory & Active Week Matrix (1–{viewedSemester.totalWeeks})
            </h3>
            <span className="text-[11px] text-slate-400">
              Click any week number to toggle status · Click Edit to update meetings
            </span>
          </div>

          {semCourses.length === 0 && (
            <div className="p-8 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="w-10 h-10 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  No courses in {viewedSemester.name} yet
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Add courses manually or use our AI Importer to convert your syllabus PDF or timetable photo into your schedule in seconds.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                {onOpenAiImportModal && (
                  <button
                    type="button"
                    onClick={onOpenAiImportModal}
                    className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Import Timetable with AI</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenCourseModal}
                  className="px-3 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 transition"
                >
                  + Add Course Manually
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {semCourses.map((course) => {
              return (
                <div
                  key={course.id}
                  className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2.5 flex flex-col justify-between shadow-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: course.color }} />
                          <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400">{course.code}</span>
                          <h4 className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">{course.name}</h4>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Room {course.location} {course.teacher ? `· ${course.teacher}` : ''}
                        </p>
                      </div>

                      {!isArchived && (
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => onEditCourse(course)}
                            className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded transition"
                            title="Edit Course Details & Meeting Times"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCourse(course.id)}
                            className="text-slate-300 hover:text-rose-600 p-1 rounded transition"
                            title="Delete Course"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {course.schedules.map((sch, sIdx) => {
                        const bounds = computeMergedSessionBounds(sch.sessions);
                        return (
                          <span
                            key={sIdx}
                            className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-700 dark:text-slate-300"
                          >
                            <strong className="font-sans font-semibold text-slate-900 dark:text-white">{DAY_NAMES_SHORT[sch.dayOfWeek]}</strong>
                            <span>S{sch.sessions.join('+')}</span>
                            <span className="text-slate-400">({bounds.startTime}–{bounds.endTime})</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-500 dark:text-slate-400 truncate">
                        Active: {course.activeWeeks.join(', ')}
                      </span>
                      <span className="text-slate-400 shrink-0">W{currentAcademicWeek}</span>
                    </div>
                    <div className="grid grid-cols-10 gap-0.5">
                      {Array.from({ length: viewedSemester.totalWeeks }, (_, i) => i + 1).map((w) => {
                        const isActive = course.activeWeeks.includes(w);
                        const isCurrent = w === currentAcademicWeek;
                        return (
                          <button
                            key={w}
                            type="button"
                            disabled={isArchived}
                            onClick={() => {
                              const next = isActive
                                ? course.activeWeeks.filter((num) => num !== w)
                                : [...course.activeWeeks, w].sort((a, b) => a - b);
                              saveCourse({ ...course, activeWeeks: next });
                            }}
                            className={`h-5 rounded font-mono text-[10px] font-medium transition flex items-center justify-center tabular-nums ${
                              isActive
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-200/80 dark:border-slate-700 hover:border-slate-400'
                            } ${isCurrent ? 'ring-1 ring-rose-500' : ''}`}
                          >
                            {w}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
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
          onEditCourse(c);
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
        onDelete={deleteEvent}
        currentAcademicWeek={currentAcademicWeek}
      />
    </div>
  );
};
