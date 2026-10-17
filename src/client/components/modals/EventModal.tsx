import React, { useState, useEffect } from 'react';
import { useWorkspace, DAY_NAMES_FULL, DAY_NAMES_SHORT, getIsoDayOfWeek, addDays, formatIsoDate, getTodayIsoDate } from '../../hooks/useWorkspace';
import { X, Trash2, Calendar, Clock, Palette, Sparkles, Dumbbell, BookOpen, Users, AlertCircle, Check, ArrowRight } from 'lucide-react';
import { ScheduleEvent, EventType } from '../../../types';
import { Twemoji } from '../common/Twemoji';

interface EventModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
  initialEvent?: ScheduleEvent | null;
}

const CATEGORY_PRESETS = [
  { name: 'Study', icon: '📖', color: '#6366F1' },
  { name: 'Fitness', icon: '🏃', color: '#059669' },
  { name: 'Meeting', icon: '👥', color: '#0284C7' },
  { name: 'Exam', icon: '📝', color: '#DC2626' },
  { name: 'Personal', icon: '☕', color: '#D97706' },
];

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

export const EventModal: React.FC<EventModalProps> = ({ ws, isOpen, onClose, initialEvent }) => {
  const { viewedSemester, timeSlots, saveEvent, deleteEvent, selectedDate } = ws;

  const [type, setType] = useState<EventType>('routine');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Study');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1]);
  const [specificDate, setSpecificDate] = useState(selectedDate || getTodayIsoDate());
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [endDate, setEndDate] = useState(selectedDate || getTodayIsoDate());
  const [isAllDay, setIsAllDay] = useState(false);
  const [useSessionSlot, setUseSessionSlot] = useState(false);
  const [selectedSession, setSelectedSession] = useState('1-2');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('08:00');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [activeWeeksPreset, setActiveWeeksPreset] = useState<'all' | 'odd' | 'even'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialEvent) {
        setType(initialEvent.type);
        setTitle(initialEvent.title);
        setCategory(initialEvent.category || 'Study');
        setDaysOfWeek(initialEvent.daysOfWeek || [1]);
        const sDate = initialEvent.specificDate || selectedDate || getTodayIsoDate();
        setSpecificDate(sDate);
        const eDate = initialEvent.endDate || sDate;
        setEndDate(eDate);
        setIsMultiDay(Boolean(initialEvent.endDate && initialEvent.endDate !== sDate));
        setIsAllDay(Boolean(initialEvent.isAllDay));
        if (initialEvent.sessions && initialEvent.sessions.length > 0) {
          setUseSessionSlot(true);
          setSelectedSession(initialEvent.sessions[0]);
        } else {
          setUseSessionSlot(false);
        }
        setStartTime(initialEvent.startTime || '07:00');
        setEndTime(initialEvent.endTime || '08:00');
        setLocation(initialEvent.location || '');
        setNotes(initialEvent.notes || '');
        setColor(initialEvent.color || '#6366F1');
      } else {
        setType('routine');
        setTitle('');
        setCategory('Study');
        setDaysOfWeek([getIsoDayOfWeek(selectedDate)]);
        const sDate = selectedDate || getTodayIsoDate();
        setSpecificDate(sDate);
        setEndDate(sDate);
        setIsMultiDay(false);
        setIsAllDay(false);
        setUseSessionSlot(false);
        setSelectedSession(timeSlots[0]?.session || '1-2');
        setStartTime('07:00');
        setEndTime('08:00');
        setLocation('');
        setNotes('');
        setColor('#6366F1');
        setActiveWeeksPreset('all');
      }
    }
  }, [isOpen, initialEvent, selectedDate, timeSlots]);

  const daysSpan = React.useMemo(() => {
    if (type !== 'event' || !isMultiDay || !endDate || endDate < specificDate) return 1;
    const d1 = new Date(specificDate + 'T00:00:00').getTime();
    const d2 = new Date(endDate + 'T00:00:00').getTime();
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  }, [type, isMultiDay, specificDate, endDate]);

  if (!isOpen) return null;

  const toggleDayOfWeek = (d: number) => {
    if (daysOfWeek.includes(d)) {
      if (daysOfWeek.length > 1) {
        setDaysOfWeek(daysOfWeek.filter(x => x !== d));
      }
    } else {
      setDaysOfWeek([...daysOfWeek, d].sort((a, b) => a - b));
    }
  };

  const handleStartDateChange = (val: string) => {
    setSpecificDate(val);
    if (isMultiDay && endDate < val) {
      setEndDate(val);
    }
  };

  const handleEndDateChange = (val: string) => {
    if (val < specificDate) {
      setEndDate(specificDate);
    } else {
      setEndDate(val);
    }
  };

  const handleSessionChange = (sessionLabel: string) => {
    setSelectedSession(sessionLabel);
    const slot = timeSlots.find(s => s.session === sessionLabel);
    if (slot) {
      setStartTime(slot.startTime);
      setEndTime(slot.endTime);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let finalDays = daysOfWeek;
    if (type === 'event') {
      if (isMultiDay && endDate && endDate > specificDate) {
        const daysSet = new Set<number>();
        const curr = new Date(specificDate + 'T00:00:00');
        const endD = new Date(endDate + 'T00:00:00');
        while (curr <= endD) {
          const day = curr.getDay() === 0 ? 7 : curr.getDay();
          daysSet.add(day);
          curr.setDate(curr.getDate() + 1);
        }
        finalDays = Array.from(daysSet).sort((a, b) => a - b);
      } else {
        finalDays = [getIsoDayOfWeek(specificDate)];
      }
    }

    const total = viewedSemester.totalWeeks || 19;
    let weeks: number[] = Array.from({ length: total }, (_, i) => i + 1);
    if (activeWeeksPreset === 'odd') {
      weeks = weeks.filter(w => w % 2 !== 0);
    } else if (activeWeeksPreset === 'even') {
      weeks = weeks.filter(w => w % 2 === 0);
    }

    const payload: ScheduleEvent = {
      id: initialEvent?.id || `ev_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      semesterId: initialEvent?.semesterId || viewedSemester.id,
      title: title.trim(),
      type,
      category,
      daysOfWeek: finalDays.map(Number),
      specificDate: type === 'event' ? specificDate : undefined,
      endDate: type === 'event' && isMultiDay && endDate ? endDate : undefined,
      isAllDay: type === 'event' ? isAllDay : undefined,
      sessions: useSessionSlot && !isAllDay ? [selectedSession] : undefined,
      startTime: isAllDay ? '00:00' : startTime,
      endTime: isAllDay ? '23:59' : endTime,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      color,
      activeWeeks: type === 'routine' ? weeks : undefined,
    };

    setIsSubmitting(true);
    try {
      await saveEvent(payload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (initialEvent && confirm(`Delete "${initialEvent.title}"?`)) {
      deleteEvent(initialEvent.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85dvh] sm:max-h-[88vh]">
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40 shrink-0">
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
              {initialEvent ? 'Edit' : 'Add'}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Add a recurring routine habit or one-off academic event
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Type Switcher */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Commitment Type
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setType('routine')}
                className={`py-2 px-3 text-xs font-medium rounded-md transition flex items-center justify-center gap-1.5 ${
                  type === 'routine'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Twemoji emoji="🔁" className="w-3.5 h-3.5" />
                <span>Recurring Routine</span>
              </button>
              <button
                type="button"
                onClick={() => setType('event')}
                className={`py-2 px-3 text-xs font-medium rounded-md transition flex items-center justify-center gap-1.5 ${
                  type === 'event'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Twemoji emoji="📅" className="w-3.5 h-3.5" />
                <span>One-Off Event</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {type === 'routine'
                ? 'Repeats every week (e.g. Morning gym, focus study hours, lab meeting).'
                : 'Occurs on a single date (e.g. Midterm exam, project presentation, thesis check-in).'}
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'routine' ? 'e.g. Morning Workout / Gym' : 'e.g. CS820 Midterm Exam'}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
            />
          </div>

          {/* Category Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_PRESETS.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => {
                    setCategory(cat.name);
                    setColor(cat.color);
                  }}
                  className={`px-2.5 py-1 text-xs rounded-md transition border flex items-center gap-1.5 ${
                    category === cat.name
                      ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-2xs ring-1 ring-slate-900/20 dark:ring-white/20'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <Twemoji emoji={cat.icon} className="w-3.5 h-3.5" />
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Configuration */}
          {type === 'routine' ? (
            <div className="space-y-3 p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Repeats on Days
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                    const isSelected = daysOfWeek.includes(d);
                    const isWeekend = d >= 6;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDayOfWeek(d)}
                        className={`py-1.5 text-xs font-mono font-medium rounded-md transition text-center ${
                          isSelected
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                            : isWeekend
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200/70'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {DAY_NAMES_SHORT[d]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Active Weeks
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveWeeksPreset('all')}
                    className={`py-1 px-2 rounded border text-center transition ${
                      activeWeeksPreset === 'all'
                        ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-2xs ring-1 ring-slate-900/20 dark:ring-white/20'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    All Weeks (1–{viewedSemester.totalWeeks})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWeeksPreset('odd')}
                    className={`py-1 px-2 rounded border text-center transition ${
                      activeWeeksPreset === 'odd'
                        ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-2xs ring-1 ring-slate-900/20 dark:ring-white/20'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Odd Weeks
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWeeksPreset('even')}
                    className={`py-1 px-2 rounded border text-center transition ${
                      activeWeeksPreset === 'even'
                        ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-2xs ring-1 ring-slate-900/20 dark:ring-white/20'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Even Weeks
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-3">
              {/* Event Duration Selector: Single Day vs Multi-Day */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Event Duration
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMultiDay(false);
                      setEndDate(specificDate);
                    }}
                    className={`py-1.5 px-2.5 text-xs font-medium rounded-md transition flex items-center justify-center gap-1.5 ${
                      !isMultiDay
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Twemoji emoji="📅" className="w-3.5 h-3.5" />
                    <span>Single Day</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMultiDay(true);
                      if (!endDate || endDate <= specificDate) {
                        setEndDate(specificDate);
                      }
                    }}
                    className={`py-1.5 px-2.5 text-xs font-medium rounded-md transition flex items-center justify-center gap-1.5 ${
                      isMultiDay
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Twemoji emoji="🗓️" className="w-3.5 h-3.5" />
                    <span>Multi-Day Range</span>
                  </button>
                </div>
              </div>

              {!isMultiDay ? (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Event Date
                  </label>
                  <input
                    type="date"
                    required
                    value={specificDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    {DAY_NAMES_FULL[getIsoDayOfWeek(specificDate)]}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Start Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={specificDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                      />
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate">
                        {DAY_NAMES_SHORT[getIsoDayOfWeek(specificDate)]}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        End Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        min={specificDate}
                        value={endDate}
                        onChange={(e) => handleEndDateChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                      />
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate">
                        {DAY_NAMES_SHORT[getIsoDayOfWeek(endDate)]}
                      </span>
                    </div>
                  </div>

                  {/* Span calculation banner */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300 text-xs">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Span: {daysSpan} Day{daysSpan > 1 ? 's' : ''}</span>
                    </span>
                    <span className="font-mono text-[11px] opacity-80">
                      {specificDate} <ArrowRight className="inline w-3 h-3 mx-0.5" /> {endDate}
                    </span>
                  </div>
                </div>
              )}

              {/* All-Day Event Toggle */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAllDay}
                    onChange={(e) => setIsAllDay(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-slate-900 focus:ring-slate-900 dark:focus:ring-white accent-slate-900 dark:accent-white"
                  />
                  <div>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      All-Day Event
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Spans entire day(s) without fixed hours
                    </p>
                  </div>
                </label>
                {isAllDay && (
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                    24h Full Day
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Time & Session Selection */}
          {isAllDay ? (
            <div className="p-3 rounded-lg border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 flex items-center gap-2 text-xs">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>All-day commitment active. Spans the entire schedule without session slots.</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Time Schedule
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSessionSlot}
                    onChange={(e) => setUseSessionSlot(e.target.checked)}
                    className="rounded accent-slate-900 dark:accent-white text-slate-900 focus:ring-slate-900 h-3.5 w-3.5"
                  />
                  <span>Snap to session slot</span>
                </label>
              </div>

              {useSessionSlot ? (
                <div>
                  <select
                    value={selectedSession}
                    onChange={(e) => handleSessionChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                  >
                    {timeSlots.map((ts) => (
                      <option key={ts.session} value={ts.session}>
                        Session {ts.session} ({ts.startTime}–{ts.endTime})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                      Start Time
                    </label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                      End Time
                    </label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Location & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Location / Link (Optional)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Science Library 3F, Gym"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Color Tag
              </label>
              <div className="flex items-center gap-1.5 h-8">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition flex items-center justify-center ${
                      color === c ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bring calculator, formula sheet, cardio routine details"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Live Preview Card */}
          <div className="rounded-lg border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-slate-400" />
                <span>Schedule Preview</span>
              </span>
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: `${color}18`, color }}
              >
                {category}
              </span>
            </div>

            <div
              className="p-2.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xs flex items-start gap-2.5"
              style={{ borderLeftWidth: '3.5px', borderLeftColor: color }}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {title.trim() || 'Untitled Commitment'}
                  </span>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                    {type === 'routine'
                      ? 'Routine'
                      : isMultiDay
                      ? `${daysSpan} Days Span`
                      : 'One-Off'}
                  </span>
                  {type === 'event' && isAllDay && (
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-800/60">
                      All-Day
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>
                      {type === 'routine'
                        ? daysOfWeek.map((d) => DAY_NAMES_SHORT[d]).join(', ')
                        : isMultiDay && endDate !== specificDate
                        ? `${specificDate} → ${endDate}`
                        : specificDate}
                    </span>
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{isAllDay ? 'All Day' : `${startTime}–${endTime}`}</span>
                  </span>
                  {location.trim() && (
                    <>
                      <span>·</span>
                      <span className="truncate max-w-[120px]">{location.trim()}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            {initialEvent ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 transition shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : initialEvent ? 'Save Changes' : 'Add to Schedule'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
