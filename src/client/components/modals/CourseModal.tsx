import React, { useState, useEffect } from 'react';
import { useWorkspace, timeToMinutes, DAY_NAMES_FULL, DAY_NAMES_SHORT } from '../../hooks/useWorkspace';
import { X, Plus, Trash2, Calendar, Clock, Palette } from 'lucide-react';
import { Course, CourseSchedule } from '../../../types';

interface CourseModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
  editingCourse?: Course | null;
}

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
  const { viewedSemester, timeSlots, saveCourse } = ws;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const activeWeeks = parseWeeks(weeksStr, viewedSemester.totalWeeks);

    const fullSchedules: CourseSchedule[] = schedules.map((s, idx) => {
      const bounds = computeMergedBounds(s.sessions);
      return {
        id: editingCourse?.schedules?.[idx]?.id || 'sch_' + Math.random().toString(36).substring(2, 9),
        dayOfWeek: s.dayOfWeek,
        sessions: s.sessions,
        startTime: bounds.startTime,
        endTime: bounds.endTime,
      };
    });

    const courseToSave: Course = {
      id: editingCourse ? editingCourse.id : 'c_' + Date.now().toString(36),
      semesterId: viewedSemester.id,
      code: code.trim(),
      name: name.trim(),
      location: location.trim(),
      teacher: teacher.trim(),
      color,
      activeWeeks,
      schedules: fullSchedules,
    };

    saveCourse(courseToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-xl rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[85dvh] sm:max-h-[88vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {editingCourse ? `Edit Course: ${editingCourse.code}` : 'Add University Course'}
            </h3>
            {editingCourse && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Updating Existing
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Row 1: Code, Title, Color */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CS801"
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Course Title</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Foundations of Deep Learning"
                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Badge Color</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-8 p-0.5 rounded border border-slate-200 dark:border-slate-700 cursor-pointer bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Row 2: Location, Teacher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Room / Location</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Turing Hall 101"
                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Instructor</label>
              <input
                type="text"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
                placeholder="Prof. Alan Turing"
                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Weekly Schedules Section (Supports 2 or more meetings per week) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Weekly Meeting Times ({schedules.length} per week)</span>
                </label>
                <p className="text-[11px] text-slate-400">Add multiple meeting days if your course meets 2, 3 or more times per week</p>
              </div>

              <button
                type="button"
                onClick={handleAddMeetingTime}
                className="px-2.5 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Meeting Day</span>
              </button>
            </div>

            <div className="space-y-3">
              {schedules.map((item, idx) => {
                const bounds = computeMergedBounds(item.sessions);
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5"
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
                          className="px-2 py-1 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                          title="Remove this meeting day"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Session Selector for this meeting */}
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        Select Session Slot(s) on {DAY_NAMES_FULL[item.dayOfWeek]}:
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                        {timeSlots.map(ts => {
                          const checked = item.sessions.includes(ts.session);
                          return (
                            <button
                              key={ts.session}
                              type="button"
                              onClick={() => handleToggleScheduleSession(idx, ts.session)}
                              className={`p-2 rounded border text-left transition ${
                                checked
                                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white font-semibold shadow-xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                              }`}
                            >
                              <div className="text-xs font-mono">S{ts.session}</div>
                              <div className={`text-[10px] font-mono ${checked ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400'}`}>
                                {ts.startTime}–{ts.endTime}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Merged Window Preview */}
                    <div className="px-2.5 py-1.5 rounded bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
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
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setWeeksStr('1-16')}
                  className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline"
                >
                  1-16
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setWeeksStr('6-17')}
                  className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline"
                >
                  6-17
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setWeeksStr(`1-${viewedSemester.totalWeeks}`)}
                  className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline"
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
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded text-xs font-medium bg-slate-900 dark:bg-white hover:bg-slate-800 text-white dark:text-slate-900"
            >
              {editingCourse ? 'Save Changes' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
