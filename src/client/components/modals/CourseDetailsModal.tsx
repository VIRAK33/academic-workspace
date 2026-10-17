import React from 'react';
import { Course, TimeSlot, Task } from '../../../types';
import { DAY_NAMES_FULL, format24To12Range, timeToMinutes } from '../../hooks/useWorkspace';
import { X, Pencil, MapPin, User, Calendar, Clock, CheckCircle2, ListTodo } from 'lucide-react';
import { Twemoji } from '../common/Twemoji';
import { ModalSheet } from '../common/ModalSheet';

interface CourseDetailsModalProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (course: Course) => void;
  timeSlots: TimeSlot[];
  currentAcademicWeek: number;
  totalWeeks?: number;
  tasks?: Task[];
}

export const CourseDetailsModal: React.FC<CourseDetailsModalProps> = ({
  course,
  isOpen,
  onClose,
  onEdit,
  timeSlots,
  currentAcademicWeek,
  totalWeeks = 19,
  tasks = [],
}) => {
  const [lastCourse, setLastCourse] = React.useState<Course | null>(course);
  React.useEffect(() => {
    if (course) setLastCourse(course);
  }, [course]);

  const activeCourse = course || lastCourse;
  if (!activeCourse) return null;

  const isWeekActive = activeCourse.activeWeeks.includes(currentAcademicWeek);

  // Helper to compute time bounds from session labels
  const getSessionTimes = (sessions: string[]) => {
    const matched = timeSlots.filter((ts) => sessions.includes(ts.session));
    if (matched.length === 0) return { start: '14:30', end: '16:05' };
    const sorted = [...matched].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    return {
      start: sorted[0].startTime,
      end: sorted[sorted.length - 1].endTime,
    };
  };

  // Find tasks related to this course
  const relatedTasks = tasks.filter((t) => {
    if (t.status === 'archived') return false;
    const titleLower = t.title.toLowerCase();
    const codeLower = activeCourse.code.toLowerCase();
    const nameLower = activeCourse.name.toLowerCase();
    const hasTag = t.tags.some((tag) => tag.toLowerCase() === codeLower || tag.toLowerCase() === 'class');
    return hasTag || titleLower.includes(codeLower) || (nameLower.length > 5 && titleLower.includes(nameLower));
  });

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-lg">
      {({ requestClose, dragHandleProps }) => (
        <>
          {/* Header Bar with Course Color Accent */}
          <div
            {...dragHandleProps}
            className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/60 dark:bg-slate-800/40 relative shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
            style={{ borderTopWidth: '4px', borderTopColor: activeCourse.color || '#2563eb' }}
          >
            <div className="space-y-1 pr-6">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  {activeCourse.code}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium ${
                    isWeekActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {isWeekActive ? `In Session · Week ${currentAcademicWeek}` : `Off this Week (W${currentAcademicWeek})`}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                {activeCourse.name}
              </h3>
            </div>

            <button
              type="button"
              onClick={requestClose}
              className="p-2 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-3.5 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>Classroom / Room</span>
                </div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  {activeCourse.location || 'Not specified'}
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>Instructor / Teacher</span>
                </div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate">
                  {activeCourse.teacher || 'Not specified'}
                </div>
              </div>
            </div>

            {/* Weekly Meeting Times */}
            <div>
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Weekly Class Schedule</span>
              </div>
              <div className="space-y-1.5">
                {activeCourse.schedules.map((sch, idx) => {
                  const times = sch.startTime && sch.endTime
                    ? { start: sch.startTime, end: sch.endTime }
                    : getSessionTimes(sch.sessions);
                  const time12h = format24To12Range(times.start, times.end);

                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {DAY_NAMES_FULL[sch.dayOfWeek]}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          S{sch.sessions.join('+')}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
                        {time12h} <span className="text-slate-400 text-[10px]">({times.start}–{times.end})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Academic Weeks Grid */}
            <div>
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Active Semester Weeks</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400 font-normal">
                  {activeCourse.activeWeeks.length} of {totalWeeks} weeks active
                </span>
              </div>
              <div className="grid grid-cols-7 sm:grid-cols-10 gap-1 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => {
                  const isActive = activeCourse.activeWeeks.includes(w);
                  const isCurrent = w === currentAcademicWeek;
                  return (
                    <div
                      key={w}
                      className={`py-1 text-center font-mono rounded text-[10px] transition ${
                        isActive
                          ? isCurrent
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold ring-1 ring-rose-500'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold'
                          : 'text-slate-300 dark:text-slate-600 line-through'
                      }`}
                      title={`Week ${w}: ${isActive ? 'Active class' : 'No class scheduled'}`}
                    >
                      W{w}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Associated Tasks */}
            {relatedTasks.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ListTodo className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Related Tasks ({relatedTasks.length})</span>
                </div>
                <div className="space-y-1">
                  {relatedTasks.slice(0, 4).map((t) => (
                    <div
                      key={t.id}
                      className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="truncate text-slate-800 dark:text-slate-200 font-medium">
                        {t.title}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                        Due: {t.dueDate}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer with Actions */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs shrink-0 z-10">
            <button
              type="button"
              onClick={requestClose}
              className="px-4 py-2 sm:px-3.5 sm:py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-[42px] sm:min-h-0 cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => {
                requestClose();
                onEdit(activeCourse);
              }}
              className="px-4 py-2 sm:px-3.5 sm:py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 transition flex items-center gap-1.5 shadow-xs min-h-[42px] sm:min-h-0 cursor-pointer"
            >
              <Pencil className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span>Edit Course</span>
            </button>
          </div>
        </>
      )}
    </ModalSheet>
  );
};
