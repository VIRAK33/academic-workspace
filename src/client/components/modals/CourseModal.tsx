import React, { useState, useEffect } from 'react';
import { useWorkspace, timeToMinutes, DAY_NAMES_FULL, DAY_NAMES_SHORT } from '../../hooks/useWorkspace';
import { X, Plus, Trash2, Calendar, Clock, Palette, Check, Sparkles } from 'lucide-react';
import { Course, CourseSchedule } from '../../../types';

interface CourseModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
  editingCourse?: Course | null;
}

const COLOR_PALETTE = [
  '#059669', // Emerald
  '#6366F1', // Indigo
  '#2563EB', // Blue
  '#D97706', // Amber
  '#DC2626', // Red
  '#9333EA', // Purple
  '#0D9488', // Teal
  '#475569', // Slate
];

interface ScheduleDraft {
  dayOfWeek: number;
  sessions: string[];
}

function formatWeeksToRangeString(weeks: number[]): string {
  if (!weeks || weeks.length === 0) return '1-16';
  const sorted = [...weeks].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
    } else {
      ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = sorted[i];
      prev = sorted[i];
    }
  }
  ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
  return ranges.join(', ');
}

export const CourseModal: React.FC<CourseModalProps> = ({ ws, isOpen, onClose, editingCourse }) => {
  const { viewedSemester, timeSlots, saveCourse, deleteCourse } = ws;

  const [code, setCode] = useState('CS501');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('11B206');
  const [teacher, setTeacher] = useState('Prof. Zhao');
  const [color, setColor] = useState('#2563eb');
  const [weeksStr, setWeeksStr] = useState('1-16');

  // Support arbitrary number of weekly meeting schedules (e.g. 2, 3, or more times per week)
  const [schedules, setSchedules] = useState<ScheduleDraft[]>([
    { dayOfWeek: 1, sessions: ['5-6', '7-8'] },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingCourse) {
        setCode(editingCourse.code);
        setName(editingCourse.name);
        setLocation(editingCourse.location);
        setTeacher(editingCourse.teacher || '');
        setColor(editingCourse.color || '#2563eb');
        setWeeksStr(formatWeeksToRangeString(editingCourse.activeWeeks));
        setSchedules(
          editingCourse.schedules.length > 0
            ? editingCourse.schedules.map(s => ({
                dayOfWeek: s.dayOfWeek,
                sessions: [...s.sessions],
              }))
            : [{ dayOfWeek: 1, sessions: ['1-2'] }]
        );
      } else {
        setCode('CS501');
        setName('');
        setLocation('11B206');
        setTeacher('');
        setColor('#2563eb');
        setWeeksStr('1-16');
        setSchedules([{ dayOfWeek: 1, sessions: ['5-6', '7-8'] }]);
      }
    }
  }, [isOpen, editingCourse]);

  if (!isOpen) return null;

  // Compute merged start & end time for any session selection
  const computeMergedBounds = (sessions: string[]) => {
    const matched = timeSlots.filter(ts => sessions.includes(ts.session));
    if (matched.length === 0) return { startTime: '08:25', endTime: '10:00' };
    const sorted = [...matched].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    return {
      startTime: sorted[0].startTime,
      endTime: sorted[sorted.length - 1].endTime,
    };
  };

  const parseWeeks = (str: string, maxWeeks: number): number[] => {
    const set = new Set<number>();
    const parts = str.split(',');
    for (const raw of parts) {
      const p = raw.trim();
      if (!p) continue;
      if (p.includes('-') || p.includes('–')) {
        const [a, b] = p.split(/[-–]/).map(x => parseInt(x.trim(), 10));
        if (!isNaN(a) && !isNaN(b)) {
          const lo = Math.max(1, Math.min(a, b));
          const hi = Math.min(maxWeeks, Math.max(a, b));
          for (let w = lo; w <= hi; w++) set.add(w);
        }
      } else {
        const n = parseInt(p, 10);
        if (!isNaN(n) && n >= 1 && n <= maxWeeks) set.add(n);
      }
    }
    const result = Array.from(set).sort((a, b) => a - b);
    return result.length > 0 ? result : Array.from({ length: maxWeeks }, (_, i) => i + 1);
  };

  // Schedule management
  const handleAddMeetingTime = () => {
    // Pick next sensible weekday
    const usedDays = schedules.map(s => s.dayOfWeek);
    let nextDay = 1;
    for (let d = 1; d <= 5; d++) {
      if (!usedDays.includes(d)) {
        nextDay = d;
        break;
      }
    }
    setSchedules([...schedules, { dayOfWeek: nextDay, sessions: ['5-6'] }]);
  };

  const handleRemoveMeetingTime = (index: number) => {
    if (schedules.length <= 1) return;
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleUpdateScheduleDay = (index: number, day: number) => {
    const next = [...schedules];
    next[index] = { ...next[index], dayOfWeek: day };
    setSchedules(next);
  };

  const handleToggleScheduleSession = (scheduleIndex: number, sessionCode: string) => {
    const next = [...schedules];
    const currentSessions = next[scheduleIndex].sessions;
    let updatedSessions: string[];

    if (currentSessions.includes(sessionCode)) {
      if (currentSessions.length > 1) {
        updatedSessions = currentSessions.filter(s => s !== sessionCode);
      } else {
        updatedSessions = currentSessions; // keep at least 1 session
      }
    } else {
      updatedSessions = [...currentSessions, sessionCode];
    }

    next[scheduleIndex] = { ...next[scheduleIndex], sessions: updatedSessions };
    setSchedules(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const activeWeeks = parseWeeks(weeksStr, viewedSemester.totalWeeks);

    const fullSchedules: CourseSchedule[] = schedules.map((s, idx) => {
      const bounds = computeMergedBounds(s.sessions);
      return {
        id: editingCourse?.schedules?.[idx]?.id || 'sch_' + Math.random().toString(36).substring(2, 9),
        dayOfWeek: Number(s.dayOfWeek),
        sessions: s.sessions,
        startTime: bounds.startTime,
        endTime: bounds.endTime,
      };
    });

    const courseToSave: Course = {
      id: editingCourse ? editingCourse.id : 'c_' + Date.now().toString(36),
      semesterId: editingCourse?.semesterId || viewedSemester.id,
      code: code.trim(),
      name: name.trim(),
      location: location.trim(),
      teacher: teacher.trim(),
      color,
      activeWeeks,
      schedules: fullSchedules,
    };

    setIsSubmitting(true);
    try {
      await saveCourse(courseToSave);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (editingCourse && confirm(`Delete course "${editingCourse.code} - ${editingCourse.name}"?`)) {
      deleteCourse(editingCourse.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-xl rounded-t-2xl sm:rounded-xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92dvh] sm:max-h-[88vh] flex flex-col">
        {/* Mobile Sheet Drag Indicator */}
        <div className="pt-2.5 pb-0.5 flex justify-center sm:hidden shrink-0">
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {editingCourse ? `Edit Course: ${editingCourse.code}` : 'Add Course'}
              </h3>
              {editingCourse && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  Editing
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Configure course schedule, location, instructor, and active weeks
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
            {/* Row 1: Code & Title */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Course Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. CS801"
                  className="w-full px-3 py-2.5 sm:px-2.5 sm:py-1.5 text-base sm:text-xs min-h-[44px] sm:min-h-[36px] font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Course Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Foundations of Deep Learning"
                  className="w-full px-3.5 py-2.5 sm:px-2.5 sm:py-1.5 text-base sm:text-xs min-h-[44px] sm:min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition"
                  autoFocus
                />
              </div>
            </div>

            {/* Row 2: Location, Teacher */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Room / Location <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Turing Hall 101"
                  className="w-full px-3.5 py-2.5 sm:px-2.5 sm:py-1.5 text-base sm:text-xs min-h-[44px] sm:min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Instructor (Optional)
                </label>
                <input
                  type="text"
                  value={teacher}
                  onChange={(e) => setTeacher(e.target.value)}
                  placeholder="e.g. Prof. Alan Turing"
                  className="w-full px-3.5 py-2.5 sm:px-2.5 sm:py-1.5 text-base sm:text-xs min-h-[44px] sm:min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition"
                />
              </div>
            </div>

            {/* Row 3: Color Tag with Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Badge Color
              </label>
              <div className="flex items-center gap-2 sm:gap-1.5 h-9 sm:h-8 flex-wrap">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 sm:w-6 sm:h-6 rounded-full transition flex items-center justify-center shrink-0 ${
                      color === c ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Weekly Schedules Section (Supports 2 or more meetings per week) */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                    <span>Weekly Meeting Times ({schedules.length} per week)</span>
                  </label>
                  <p className="text-[11px] text-slate-400">Add multiple meeting days if your course meets 2, 3 or more times per week</p>
                </div>

                <button
                  type="button"
                  onClick={handleAddMeetingTime}
                  className="px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1 min-h-[38px] sm:min-h-0"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                  <span>Add Day</span>
                </button>
              </div>

              <div className="space-y-3">
                {schedules.map((item, idx) => {
                  const bounds = computeMergedBounds(item.sessions);
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-mono text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Meeting {idx + 1}:
                          </span>
                          <select
                            value={item.dayOfWeek}
                            onChange={(e) => handleUpdateScheduleDay(idx, parseInt(e.target.value, 10))}
                            className="px-3 py-2 sm:px-2 sm:py-1 text-base sm:text-xs min-h-[40px] sm:min-h-[32px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition"
                          >
                            <option value={1}>Monday</option>
                            <option value={2}>Tuesday</option>
                            <option value={3}>Wednesday</option>
                            <option value={4}>Thursday</option>
                            <option value={5}>Friday</option>
                            <option value={6}>Saturday</option>
                            <option value={7}>Sunday</option>
                          </select>
                        </div>

                        {schedules.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMeetingTime(idx)}
                            className="text-slate-400 hover:text-rose-600 p-2 sm:p-1 rounded-lg transition min-h-[36px] sm:min-h-0 flex items-center justify-center"
                            title="Remove this meeting day"
                          >
                            <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Session Selector for this meeting */}
                      <div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                          Select Session Slot(s) on {DAY_NAMES_FULL[item.dayOfWeek]}:
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-1.5">
                          {timeSlots.map(ts => {
                            const checked = item.sessions.includes(ts.session);
                            return (
                              <button
                                key={ts.session}
                                type="button"
                                onClick={() => handleToggleScheduleSession(idx, ts.session)}
                                className={`p-2.5 sm:p-2 rounded-lg border text-left transition min-h-[44px] sm:min-h-[36px] ${
                                  checked
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white font-semibold shadow-xs'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                                }`}
                              >
                                <div className="text-xs font-mono font-medium">S{ts.session}</div>
                                <div className={`text-[10px] font-mono ${checked ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400'}`}>
                                  {ts.startTime}–{ts.endTime}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Merged Window Preview */}
                      <div className="px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-sans">
                          Calculated Time Window:
                        </span>
                        <span className="font-mono font-medium text-slate-900 dark:text-white">
                          {DAY_NAMES_SHORT[item.dayOfWeek]} S{item.sessions.join('+')} ({bounds.startTime} – {bounds.endTime})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Weeks */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Active Weeks</label>
                <div className="flex items-center gap-2 sm:gap-1.5">
                  <button
                    type="button"
                    onClick={() => setWeeksStr('1-16')}
                    className="text-xs sm:text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline p-1"
                  >
                    1-16
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setWeeksStr('6-17')}
                    className="text-xs sm:text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline p-1"
                  >
                    6-17
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setWeeksStr(`1-${viewedSemester.totalWeeks}`)}
                    className="text-xs sm:text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline p-1"
                  >
                    All 1-{viewedSemester.totalWeeks}
                  </button>
                </div>
              </div>
              <input
                type="text"
                required
                value={weeksStr}
                onChange={(e) => setWeeksStr(e.target.value)}
                placeholder="e.g. 1-16 or 6-17 or 1-4, 9-14"
                className="w-full px-3 py-2.5 sm:px-2.5 sm:py-1.5 text-base sm:text-xs min-h-[44px] sm:min-h-[36px] font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition"
              />
            </div>

            {/* Live Preview Card */}
            <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-slate-400" />
                  <span>Course Card Preview</span>
                </span>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: `${color}18`, color }}
                >
                  {code.trim() || 'CS???'}
                </span>
              </div>

              <div
                className="p-3 sm:p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xs flex items-start gap-2.5"
                style={{ borderLeftWidth: '3.5px', borderLeftColor: color }}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {name.trim() || 'Untitled Course'}
                    </span>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                      {schedules.length} Meeting{schedules.length > 1 ? 's' : ''}/Wk
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>
                        {schedules
                          .map((s) => `${DAY_NAMES_SHORT[s.dayOfWeek]} S${s.sessions.join('+')}`)
                          .join(', ')}
                      </span>
                    </span>
                    {location.trim() && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-[120px]">{location.trim()}</span>
                      </>
                    )}
                    {teacher.trim() && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-[120px]">{teacher.trim()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Thumb-Friendly Action Bar */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs shrink-0 z-10">
            {editingCourse ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-2.5 sm:py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1.5 min-h-[42px] sm:min-h-0"
              >
                <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span>Delete</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-[42px] sm:min-h-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 sm:px-4 sm:py-1.5 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 disabled:opacity-50 transition shadow-xs min-h-[42px] sm:min-h-0"
              >
                {isSubmitting ? 'Saving...' : editingCourse ? 'Save Changes' : 'Create Course'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
