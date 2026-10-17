import React, { useState, useMemo } from 'react';
import {
  useWorkspace,
  DAY_NAMES_SHORT,
  MONTH_NAMES_SHORT,
  timeToMinutes,
  addDays,
  getTodayIsoDate,
  parseIsoDate,
  formatCourseDurationWeeks,
} from '../../hooks/useWorkspace';
import {
  Plus,
  Trash2,
  Pencil,
  Sparkles,
  BellRing,
  Calendar,
  Clock,
  ChevronDown,
  Settings2,
  BookOpen,
  MoreVertical,
  Eye,
  LayoutGrid,
  CalendarDays,
  CalendarRange,
  Check,
} from 'lucide-react';
import { Course, ScheduleEvent } from '../../../types';
import { Twemoji } from '../common/Twemoji';
import { CourseDetailsModal } from '../modals/CourseDetailsModal';
import { EventDetailsModal } from '../modals/EventDetailsModal';
import { WeeklyAppleCalendarView } from './WeeklyAppleCalendarView';

interface CardOptionMenuProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  viewLabel?: string;
}

const CardOptionMenu: React.FC<CardOptionMenuProps> = ({
  onEdit,
  onDelete,
  onView,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
  viewLabel = 'View Details',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        title="More options"
        aria-label="More options"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-36 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {onView && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onView();
              }}
              className="w-full px-2.5 py-1.5 text-xs text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition"
            >
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>{viewLabel}</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onEdit();
              }}
              className="w-full px-2.5 py-1.5 text-xs text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-400" />
              <span>{editLabel}</span>
            </button>
          )}

          {onDelete && (
            <>
              {(onView || onEdit) && (
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              )}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onDelete();
                }}
                className="w-full px-2.5 py-1.5 text-xs text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition font-medium"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>{deleteLabel}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

type ViewMode = 'table' | 'week' | 'month' | 'year';

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
    selectedDate,
    attendanceRecords,
    getCourseAttendanceStats,
    getRoutineAttendanceStats,
    setAttendanceStatus,
    getAttendanceRecord,
    saveCourse,
    deleteCourse,
    deleteEvent,
  } = ws;

  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);
  const [viewingEvent, setViewingEvent] = useState<ScheduleEvent | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const actionMenuRef = React.useRef<HTMLDivElement>(null);

  // Unified noise-free view mode: Table | Week | Month | Year
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('phd_timetable_view_mode');
      if (saved === 'week' || saved === 'month' || saved === 'year' || saved === 'table') {
        return saved as ViewMode;
      }
      if (saved === 'matrix') return 'table';
      if (saved === 'calendar') return 'week';
    } catch {}
    return 'week';
  });

  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [yearOffset, setYearOffset] = useState<number>(0);
  const [isDirectoryExpanded, setIsDirectoryExpanded] = useState<boolean>(false);


  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('phd_timetable_view_mode', mode);
    } catch {}
  };

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setIsAddMenuOpen(false);
        setIsOptionsMenuOpen(false);
      }
    };
    if (isAddMenuOpen || isOptionsMenuOpen) {
      document.addEventListener('pointerdown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [isAddMenuOpen, isOptionsMenuOpen]);

  const semCourses = courses.filter((c) => c.semesterId === viewedSemester.id);
  const semEvents = (events || []).filter((e) => e.semesterId === viewedSemester.id);
  const isArchived = viewedSemester.isArchived || !viewedSemester.isActive;

  const activeWeekNum = Math.max(1, Math.min(viewedSemester.totalWeeks || 19, currentAcademicWeek + weekOffset));

  const mondayIso = useMemo(() => {
    return addDays(viewedSemester.startDate, (activeWeekNum - 1) * 7);
  }, [viewedSemester.startDate, activeWeekNum]);

  const midDayIso = useMemo(() => addDays(mondayIso, 2), [mondayIso]);
  const midDt = useMemo(() => parseIsoDate(midDayIso), [midDayIso]);
  const monthTitle = MONTH_NAMES_SHORT[midDt.getUTCMonth()];

  // Automatically sync offsets when jumping to Today from the top global Header
  React.useEffect(() => {
    if (ws.selectedDate === getTodayIsoDate()) {
      setWeekOffset(0);
      setYearOffset(0);
    }
  }, [ws.selectedDate]);

  const displayTitle = useMemo(() => {
    if (viewMode === 'table') return 'Class';
    if (viewMode === 'year') {
      const baseDt = parseIsoDate(ws.selectedDate || getTodayIsoDate());
      return `${baseDt.getUTCFullYear() + yearOffset}`;
    }
    if (viewMode === 'month') {
      const baseDt = parseIsoDate(ws.selectedDate || getTodayIsoDate());
      return MONTH_NAMES_SHORT[baseDt.getUTCMonth()];
    }
    return monthTitle;
  }, [viewMode, ws.selectedDate, yearOffset, monthTitle]);

  const daysToDisplay = showWeekend ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5];

  // Deduplicate session slots to prevent duplicate rows
  const uniqueTimeSlots = useMemo(() => {
    const seen = new Set<string>();
    const res: typeof timeSlots = [];
    for (const ts of timeSlots) {
      if (!seen.has(ts.session)) {
        seen.add(ts.session);
        res.push(ts);
      }
    }
    return res;
  }, [timeSlots]);

  // Compute merged session start/end
  const computeMergedSessionBounds = (sessionLabels: string[]) => {
    const matchedSlots = uniqueTimeSlots.filter((ts) => sessionLabels.includes(ts.session));
    if (matchedSlots.length === 0) return { startTime: '14:30', endTime: '16:05' };
    const sorted = [...matchedSlots].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    return {
      startTime: sorted[0].startTime,
      endTime: sorted[sorted.length - 1].endTime,
    };
  };

  // Find events matching a specific cell
  const getSlotEvents = (day: number, sessionLabel: string, slotStart: string, slotEnd: string) => {
    const cellIso = addDays(viewedSemester.startDate, (activeWeekNum - 1) * 7 + (day - 1));
    const slotStartM = timeToMinutes(slotStart);
    const slotEndM = timeToMinutes(slotEnd);

    return semEvents.filter((ev) => {
      if (ev.type === 'routine' && !showRoutines) return false;
      if (ev.type === 'event' && !showEvents) return false;

      if (ev.type === 'routine') {
        const days = (ev.daysOfWeek || []).map(Number);
        if (!days.includes(day)) return false;
        if (ev.activeWeeks && ev.activeWeeks.length > 0 && !ev.activeWeeks.map(Number).includes(activeWeekNum)) return false;
      } else if (ev.type === 'event') {
        const evStart = ev.specificDate || '';
        const evEnd = ev.endDate || evStart;
        if (!evStart || cellIso < evStart || cellIso > evEnd) return false;
      }

      if (ev.sessions && ev.sessions.length > 0) {
        return ev.sessions.includes(sessionLabel);
      }

      const evStartM = timeToMinutes(ev.startTime);
      const evEndM = timeToMinutes(ev.endTime);

      // If early morning before first session, show in the first session row
      if (sessionLabel === uniqueTimeSlots[0]?.session && evStartM < slotStartM) {
        return true;
      }
      // If late evening after last session, show in the last session row
      if (sessionLabel === uniqueTimeSlots[uniqueTimeSlots.length - 1]?.session && evStartM >= slotEndM) {
        return true;
      }
      // Overlaps with this session: starts before slot ends AND ends after slot starts
      return (evStartM < slotEndM && evEndM > slotStartM) || (evStartM >= slotStartM && evStartM < slotEndM);
    });
  };

  const slotCount = uniqueTimeSlots.length;
  const skipMatrix: Record<string, boolean> = {};

  const renderTitle = (
    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 min-w-0">
      <h2 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white tracking-tight font-sans truncate">
        {displayTitle}
      </h2>

      {viewMode !== 'year' && (
        <span className="text-[10px] sm:text-[11px] font-mono px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
          W{activeWeekNum}
        </span>
      )}
    </div>
  );

  const renderModeSwitcher = (
    <div className="flex justify-center shrink-0">
      <div className="inline-flex items-center rounded-lg p-0.5 bg-slate-200/70 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-2xs">
        <button
          type="button"
          onClick={() => handleViewModeChange('table')}
          className={`py-1 rounded text-xs transition-all duration-150 flex items-center gap-1 ${
            viewMode === 'table'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold px-2 sm:px-2.5'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium px-1.5 sm:px-2'
          }`}
          title="University class matrix table (S1–S10 session grid)"
        >
          <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Table</span>
          <span className="sm:hidden">{viewMode === 'table' ? 'Table' : 'T'}</span>
        </button>
        <button
          type="button"
          onClick={() => handleViewModeChange('week')}
          className={`py-1 rounded text-xs transition-all duration-150 flex items-center gap-1 ${
            viewMode === 'week'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold px-2 sm:px-2.5'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium px-1.5 sm:px-2'
          }`}
          title="Apple Calendar weekly continuous timeline"
        >
          <CalendarDays className="w-3.5 h-3.5 shrink-0 text-rose-500 dark:text-rose-400" />
          <span className="hidden sm:inline">Week</span>
          <span className="sm:hidden">{viewMode === 'week' ? 'Week' : 'W'}</span>
        </button>
        <button
          type="button"
          onClick={() => handleViewModeChange('month')}
          className={`py-1 rounded text-xs transition-all duration-150 flex items-center gap-1 ${
            viewMode === 'month'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold px-2 sm:px-2.5'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium px-1.5 sm:px-2'
          }`}
          title="Apple Calendar month overview"
        >
          <Calendar className="w-3.5 h-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
          <span className="hidden sm:inline">Month</span>
          <span className="sm:hidden">{viewMode === 'month' ? 'Month' : 'M'}</span>
        </button>
        <button
          type="button"
          onClick={() => handleViewModeChange('year')}
          className={`py-1 rounded text-xs transition-all duration-150 flex items-center gap-1 ${
            viewMode === 'year'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold px-2 sm:px-2.5'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium px-1.5 sm:px-2'
          }`}
          title="Apple Calendar 12-month year view"
        >
          <CalendarRange className="w-3.5 h-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
          <span className="hidden sm:inline">Year</span>
          <span className="sm:hidden">{viewMode === 'year' ? 'Year' : 'Y'}</span>
        </button>
      </div>
    </div>
  );

  const renderActionButtons = (
    <div ref={actionMenuRef} className="flex items-center gap-1 sm:gap-1.5 shrink-0">
      {/* Options Dropdown (Includes Weekend, Layers, Configuration & Import) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setIsOptionsMenuOpen(!isOptionsMenuOpen);
            setIsAddMenuOpen(false);
          }}
          className={`p-1.5 sm:px-2 sm:py-1.5 md:px-2.5 rounded-lg border text-xs font-medium transition flex items-center gap-1 shadow-2xs cursor-pointer ${
            isOptionsMenuOpen
              ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'
              : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}
          title="Timetable options & display settings"
        >
          <Settings2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="hidden md:inline">Options</span>
          <ChevronDown className={`w-3 h-3 text-slate-400 hidden md:inline transition-transform ${isOptionsMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOptionsMenuOpen && (
          <div className="absolute right-0 mt-1.5 w-60 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Display & Layers
            </div>

            <button
              type="button"
              onClick={() => setShowWeekend(!showWeekend)}
              className="w-full px-3 py-1.5 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Weekend (Sat & Sun)</span>
              </div>
              {showWeekend && <Check className="w-3.5 h-3.5 text-blue-500" />}
            </button>

            <button
              type="button"
              onClick={() => setShowRoutines(!showRoutines)}
              className="w-full px-3 py-1.5 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Twemoji emoji="🔁" className="w-3.5 h-3.5" />
                <span>Routines & Habits</span>
              </div>
              {showRoutines && <Check className="w-3.5 h-3.5 text-emerald-500" />}
            </button>

            <button
              type="button"
              onClick={() => setShowEvents(!showEvents)}
              className="w-full px-3 py-1.5 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Twemoji emoji="📅" className="w-3.5 h-3.5" />
                <span>Events & Milestones</span>
              </div>
              {showEvents && <Check className="w-3.5 h-3.5 text-rose-500" />}
            </button>

            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Configuration & Utilities
            </div>

            {onOpenAiImportModal && (
              <button
                type="button"
                onClick={() => {
                  setIsOptionsMenuOpen(false);
                  onOpenAiImportModal();
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">AI Timetable Import</div>
                  <div className="text-[10px] text-slate-400">Import syllabus PDF or photo</div>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsOptionsMenuOpen(false);
                onOpenTimeSlotsModal();
              }}
              className="w-full px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <div>
                <div className="font-medium text-slate-900 dark:text-white">Session Time Slots</div>
                <div className="text-[10px] text-slate-400">Configure university S1–S10 times</div>
              </div>
            </button>

            {onOpenRemindersModal && (
              <button
                type="button"
                onClick={() => {
                  setIsOptionsMenuOpen(false);
                  onOpenRemindersModal();
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5 text-slate-500" />
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">Reminders & ICS Export</div>
                  <div className="text-[10px] text-slate-400">Class alerts & calendar export</div>
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* + Add Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setIsAddMenuOpen(!isAddMenuOpen);
            setIsOptionsMenuOpen(false);
          }}
          className="p-1.5 sm:px-2.5 sm:py-1.5 md:px-3 rounded-lg bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold transition flex items-center gap-1 shadow-xs cursor-pointer"
          title="Add new course or event"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden md:inline">Add</span>
          <ChevronDown className={`w-3 h-3 text-white/80 dark:text-slate-600 hidden md:inline transition-transform ${isAddMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {isAddMenuOpen && (
          <div className="absolute right-0 mt-1.5 w-56 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Create New
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAddMenuOpen(false);
                onOpenCourseModal();
              }}
              className="w-full px-3 py-2 text-left text-xs text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer"
            >
              <div className="p-1 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-medium text-slate-900 dark:text-white">New Course</div>
                <div className="text-[10px] text-slate-400">Lectures, sessions, room & teacher</div>
              </div>
            </button>
            {onOpenEventModal && (
              <button
                type="button"
                onClick={() => {
                  setIsAddMenuOpen(false);
                  onOpenEventModal();
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer"
              >
                <div className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">Routine or Event</div>
                  <div className="text-[10px] text-slate-400">Recurring habit or one-off event</div>
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Main Timetable & Calendar Box ──────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-2xs">
        {/* Unified macOS Apple Header Toolbar - Always 1 single row */}
        <div className="px-2.5 sm:px-4 py-2 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-1 sm:gap-2 w-full">
          {renderTitle}
          {renderModeSwitcher}
          {renderActionButtons}
        </div>

        {/* ── View Body ─────────────────────────────────────────────────── */}
        {/* 1. Classic Class Matrix Table */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className={`w-full text-left border-collapse table-fixed ${showWeekend ? 'min-w-[770px] sm:min-w-[840px]' : 'min-w-[550px] sm:min-w-[650px]'}`}>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">
                  <th className="py-1.5 px-1 sm:px-2 w-14 sm:w-20 border-r border-slate-200 dark:border-slate-800 font-medium text-center sm:text-left shrink-0">Session</th>
                  {daysToDisplay.map((day, dIdx) => {
                    const cellIso = addDays(viewedSemester.startDate, (activeWeekNum - 1) * 7 + (day - 1));
                    const [, m, d] = cellIso.split('-');
                    const todayIso = getTodayIsoDate();
                    const isToday = cellIso === todayIso;
                    const isWeekend = day >= 6;

                    return (
                      <th
                        key={day}
                        style={{ width: `${(100 / daysToDisplay.length).toFixed(2)}%` }}
                        className={`py-1.5 px-1.5 sm:px-2.5 font-medium ${
                          dIdx < daysToDisplay.length - 1 ? 'border-r border-slate-200 dark:border-slate-800' : ''
                        } ${isWeekend ? 'bg-slate-100/40 dark:bg-slate-800/60' : ''} ${
                          isToday ? 'text-slate-900 dark:text-white font-bold' : ''
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-center sm:text-left">
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
                {uniqueTimeSlots.map((slot, r) => {
                  return (
                    <tr key={slot.session}>
                      <td className="py-1.5 px-1 sm:py-2 sm:px-2 w-14 sm:w-20 bg-slate-50/50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-800 align-top text-center sm:text-left shrink-0">
                        <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-[11px] sm:text-xs">
                          S{slot.session}
                        </div>
                        <div className="font-mono text-[9px] sm:text-[10px] text-slate-400 mt-0.5 tabular-nums">
                          <span className="sm:hidden">{slot.startTime}</span>
                          <span className="hidden sm:inline">{slot.startTime}–{slot.endTime}</span>
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
                              while (r + k < slotCount) {
                                const nextSlot = uniqueTimeSlots[r + k];
                                if (sch.sessions.includes(nextSlot.session)) {
                                  spanCount++;
                                  skipMatrix[`${r + k}_${day}`] = true;
                                  k++;
                                } else {
                                  break;
                                }
                              }
                              break;
                            }
                          }
                          if (matchedCourse) break;
                        }

                        const cellEvents = getSlotEvents(day, slot.session, slot.startTime, slot.endTime);
                        const isWeekend = day >= 6;

                        return (
                          <td
                            key={day}
                            rowSpan={spanCount}
                            className={`p-1 sm:p-1.5 align-top relative transition-colors ${
                              dIdx < daysToDisplay.length - 1 ? 'border-r border-slate-200 dark:border-slate-800' : ''
                            } ${isWeekend ? 'bg-slate-50/30 dark:bg-slate-800/20' : ''}`}
                          >
                            <div className="space-y-1.5">
                              {matchedCourse && matchedSched && (
                                <div
                                  onClick={() => setViewingCourse(matchedCourse)}
                                  className={`p-1.5 sm:p-2 rounded-md transition cursor-pointer flex flex-col justify-between shadow-2xs hover:shadow-xs group ${
                                    !matchedCourse.activeWeeks.includes(activeWeekNum)
                                      ? 'opacity-40 border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                                      : 'border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800'
                                  }`}
                                  style={{
                                    borderLeftWidth: '3px',
                                    borderLeftColor: matchedCourse.color,
                                  }}
                                  title="Click to view course details"
                                >
                                  <div className="space-y-0.5">
                                    <div className="flex items-center justify-between gap-1 leading-none">
                                      <span
                                        className="font-mono text-[9px] sm:text-[10px] font-bold truncate"
                                        style={{ color: matchedCourse.color }}
                                      >
                                        {matchedCourse.code}
                                      </span>
                                      {!isArchived && (
                                        <CardOptionMenu
                                          onView={() => setViewingCourse(matchedCourse)}
                                          onEdit={() => onEditCourse(matchedCourse!)}
                                          onDelete={() => {
                                            if (window.confirm(`Delete course "${matchedCourse?.code} - ${matchedCourse?.name}"?`)) {
                                              deleteCourse(matchedCourse!.id);
                                            }
                                          }}
                                          viewLabel="View Course"
                                          editLabel="Edit Course"
                                          deleteLabel="Delete Course"
                                        />
                                      )}
                                    </div>
                                    <div className="font-semibold text-[10px] sm:text-xs text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">
                                      {matchedCourse.name}
                                    </div>
                                    <div className="text-[9px] sm:text-[10px] text-slate-400 truncate">
                                      {matchedCourse.location}
                                      {matchedCourse.teacher ? ` · ${matchedCourse.teacher}` : ''}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {cellEvents.length > 0 && (
                                <div className="space-y-1">
                                  {cellEvents.map((ev) => {
                                    const isRoutine = ev.type === 'routine';
                                    return (
                                      <div
                                        key={ev.id}
                                        onClick={() => setViewingEvent(ev)}
                                        className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer shadow-2xs hover:shadow-xs transition"
                                        style={{ borderLeftWidth: '3px', borderLeftColor: ev.color }}
                                        title={`Click to view details (${ev.startTime}–${ev.endTime})`}
                                      >
                                        <div className="flex items-center justify-between gap-1">
                                          <div className="flex items-center gap-1 font-mono text-[9px] font-bold" style={{ color: ev.color }}>
                                            <Twemoji emoji={isRoutine ? '🔁' : '📅'} className="w-2.5 h-2.5" />
                                            <span className="truncate">{ev.category || (isRoutine ? 'Routine' : 'Event')}</span>
                                          </div>
                                          <span className="font-mono text-[9px] text-slate-400 tabular-nums">
                                            {ev.startTime}–{ev.endTime}
                                          </span>
                                        </div>
                                        <div className="text-[10px] font-semibold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                                          {ev.title}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {!matchedCourse && cellEvents.length === 0 && <div className="h-8" />}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. Apple Calendar Views (Week, Month, Year - Flush layout) */}
        {viewMode !== 'table' && (
          <div>
            <WeeklyAppleCalendarView
              ws={ws}
              subMode={viewMode}
              weekOffset={weekOffset}
              yearOffset={yearOffset}
              onSelectDateAndSwitchToWeek={(isoDate) => {
                ws.setSelectedDate(isoDate);
                setViewMode('week');
              }}
              onOpenCourseModal={onOpenCourseModal}
              onEditCourse={onEditCourse}
              onOpenEventModal={onOpenEventModal || (() => {})}
              onEditEvent={onEditEvent}
              setViewingCourse={setViewingCourse}
              setViewingEvent={setViewingEvent}
            />
          </div>
        )}
      </div>

      {/* ── Collapsible Directory & Matrix Section (Reduced Visual Noise) ── */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setIsDirectoryExpanded(!isDirectoryExpanded)}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between transition shadow-2xs cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-900 dark:text-white">
              Course Directory & Active Week Matrix ({semCourses.length} courses)
            </span>
            <span className="text-slate-400 font-normal hidden sm:inline">
              · Routines & Habits ({semEvents.length})
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <span>{isDirectoryExpanded ? 'Hide' : 'Configure Weeks & Courses'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDirectoryExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isDirectoryExpanded && (
          <div className="mt-4 space-y-6 animate-in fade-in duration-150">
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
                    <span>Add</span>
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

                            <CardOptionMenu
                              onView={() => setViewingEvent(ev)}
                              onEdit={onEditEvent ? () => onEditEvent(ev) : undefined}
                              onDelete={() => {
                                if (window.confirm(`Delete "${ev.title}"?`)) {
                                  deleteEvent(ev.id);
                                }
                              }}
                              viewLabel="View Details"
                              editLabel={isRoutine ? 'Edit Routine' : 'Edit Event'}
                              deleteLabel={isRoutine ? 'Delete Routine' : 'Delete Event'}
                            />
                          </div>

                          <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                            <div className="font-mono text-[10px] flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>
                                {isRoutine
                                  ? ev.daysOfWeek.map((d) => DAY_NAMES_SHORT[d]).join(', ')
                                  : ev.endDate && ev.endDate !== ev.specificDate
                                  ? `${ev.specificDate} → ${ev.endDate}`
                                  : ev.specificDate}{' '}
                                · {ev.isAllDay ? 'All Day' : `${ev.startTime}–${ev.endTime}`}
                              </span>
                            </div>
                            {ev.location && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Twemoji emoji="📍" className="w-2.5 h-2.5" />
                                <span>{ev.location}</span>
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
                  <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      No courses in {viewedSemester.name} yet
                    </h3>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {semCourses.map((course) => {
                  return (
                    <div
                      key={course.id}
                      onClick={() => setViewingCourse(course)}
                      className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2.5 flex flex-col justify-between shadow-xs cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 transition"
                      title="Click to view course details"
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
                            <CardOptionMenu
                              onView={() => setViewingCourse(course)}
                              onEdit={() => onEditCourse(course)}
                              onDelete={() => {
                                if (window.confirm(`Delete course "${course.code} - ${course.name}"?`)) {
                                  deleteCourse(course.id);
                                }
                              }}
                              viewLabel="View Details"
                              editLabel="Edit Course"
                              deleteLabel="Delete Course"
                            />
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
                          <span className="text-slate-400 shrink-0">W{activeWeekNum}</span>
                        </div>
                        <div className="grid grid-cols-10 gap-0.5">
                          {Array.from({ length: viewedSemester.totalWeeks }, (_, i) => i + 1).map((w) => {
                            const isActive = course.activeWeeks.includes(w);
                            const isCurrent = w === activeWeekNum;
                            return (
                              <button
                                key={w}
                                type="button"
                                disabled={isArchived}
                                onClick={(e) => {
                                  e.stopPropagation();
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
        )}
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
        timeSlots={uniqueTimeSlots}
        currentAcademicWeek={activeWeekNum}
        totalWeeks={viewedSemester.totalWeeks}
        tasks={tasks}
        selectedDate={selectedDate}
        attendanceRecords={attendanceRecords}
        getCourseAttendanceStats={getCourseAttendanceStats}
        setAttendanceStatus={setAttendanceStatus}
        getAttendanceRecord={getAttendanceRecord}
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
        currentAcademicWeek={activeWeekNum}
        selectedDate={selectedDate}
        attendanceRecords={attendanceRecords}
        getRoutineAttendanceStats={getRoutineAttendanceStats}
        setAttendanceStatus={setAttendanceStatus}
        getAttendanceRecord={getAttendanceRecord}
      />
    </div>
  );
};
