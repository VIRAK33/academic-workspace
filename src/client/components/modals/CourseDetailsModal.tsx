import React from 'react';
import { Course, TimeSlot, Task, AttendanceRecord, CommitmentStatus } from '../../../types';
import { DAY_NAMES_FULL, format24To12Range, timeToMinutes, formatHumanDate, getTodayIsoDate } from '../../hooks/useWorkspace';
import { Pencil, MapPin, User, Calendar, Clock, CheckCircle2, ListTodo, Check, X, Minus, History, Award } from 'lucide-react';
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
  selectedDate?: string;
  attendanceRecords?: AttendanceRecord[];
  getCourseAttendanceStats?: (courseId: string) => {
    totalEvaluated: number;
    attended: number;
    missed: number;
    excused: number;
    ratePercent: number;
    records: AttendanceRecord[];
  };
  setAttendanceStatus?: (
    targetId: string,
    targetType: 'course' | 'routine' | 'event',
    date: string,
    status: CommitmentStatus | null,
    note?: string,
    academicWeek?: number
  ) => Promise<void>;
  getAttendanceRecord?: (targetId: string, date: string) => AttendanceRecord | undefined;
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
  selectedDate,
  attendanceRecords,
  getCourseAttendanceStats,
  setAttendanceStatus,
  getAttendanceRecord,
}) => {
  const [lastCourse, setLastCourse] = React.useState<Course | null>(course);
  const [showHistory, setShowHistory] = React.useState(false);
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
          {/* Header Bar */}
          <div
            {...dragHandleProps}
            className="px-5 py-3 sm:px-6 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-white dark:bg-slate-900 relative shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
          >
            <div className="space-y-1 flex-1 min-w-0">
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
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: activeCourse.color || '#2563eb' }}
                />
                <span>{activeCourse.name}</span>
              </h3>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 space-y-3.5 overflow-y-auto custom-scrollbar flex-1 text-xs">
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

            {/* Attendance & Participation Tracker */}
            {getCourseAttendanceStats && (
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Attendance & Consistency</span>
                  </div>
                  {(() => {
                    const stats = getCourseAttendanceStats(activeCourse.id);
                    return (
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                        {stats.ratePercent}% Rate
                      </span>
                    );
                  })()}
                </div>

                {(() => {
                  const stats = getCourseAttendanceStats(activeCourse.id);
                  const effectiveDate = selectedDate || getTodayIsoDate();
                  const curRecord = getAttendanceRecord ? getAttendanceRecord(activeCourse.id, effectiveDate) : undefined;
                  const total = Math.max(1, stats.attended + stats.missed + stats.excused);
                  const attendedPct = (stats.attended / total) * 100;
                  const missedPct = (stats.missed / total) * 100;
                  const excusedPct = (stats.excused / total) * 100;

                  return (
                    <div className="space-y-2">
                      {/* Attendance Visual Bar */}
                      <div className="space-y-1">
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                          <div style={{ width: `${attendedPct}%` }} className="bg-emerald-500 h-full transition-all" title={`${stats.attended} Attended`} />
                          <div style={{ width: `${missedPct}%` }} className="bg-rose-500 h-full transition-all" title={`${stats.missed} Missed`} />
                          <div style={{ width: `${excusedPct}%` }} className="bg-slate-400 h-full transition-all" title={`${stats.excused} Excused`} />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {stats.attended} Attended
                          </span>
                          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {stats.missed} Missed
                          </span>
                          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            {stats.excused} Excused
                          </span>
                        </div>
                      </div>

                      {/* Check-in Selector for Today / Selected Date */}
                      {setAttendanceStatus && (
                        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                              Check-in for <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{formatHumanDate(effectiveDate)}</span>:
                            </span>
                            {curRecord && (
                              <button
                                type="button"
                                onClick={() => setAttendanceStatus(activeCourse.id, 'course', effectiveDate, null, undefined, currentAcademicWeek)}
                                className="text-[10px] text-slate-400 hover:text-rose-500 transition cursor-pointer"
                              >
                                Clear status
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              onClick={() => setAttendanceStatus(activeCourse.id, 'course', effectiveDate, 'attended', undefined, currentAcademicWeek)}
                              className={`py-1 px-2 rounded-md font-medium text-[11px] transition flex items-center justify-center gap-1 border cursor-pointer ${
                                curRecord?.status === 'attended'
                                  ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-2xs'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              <span>Attended</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setAttendanceStatus(activeCourse.id, 'course', effectiveDate, 'missed', undefined, currentAcademicWeek)}
                              className={`py-1 px-2 rounded-md font-medium text-[11px] transition flex items-center justify-center gap-1 border cursor-pointer ${
                                curRecord?.status === 'missed'
                                  ? 'bg-rose-600 text-white border-rose-600 font-semibold shadow-2xs'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700'
                              }`}
                            >
                              <X className="w-3 h-3" />
                              <span>Missed</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setAttendanceStatus(activeCourse.id, 'course', effectiveDate, 'excused', undefined, currentAcademicWeek)}
                              className={`py-1 px-2 rounded-md font-medium text-[11px] transition flex items-center justify-center gap-1 border cursor-pointer ${
                                curRecord?.status === 'excused'
                                  ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-700 font-semibold shadow-2xs'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              <Minus className="w-3 h-3" />
                              <span>Excused</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Past Recorded Sessions History Toggle */}
                      {stats.records.length > 0 && (
                        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
                          <button
                            type="button"
                            onClick={() => setShowHistory(!showHistory)}
                            className="w-full flex items-center justify-between text-[10px] font-mono text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition py-0.5 cursor-pointer"
                          >
                            <span className="flex items-center gap-1">
                              <History className="w-3 h-3" />
                              <span>Past Recorded Sessions ({stats.records.length})</span>
                            </span>
                            <span>{showHistory ? 'Hide ▲' : 'Show ▼'}</span>
                          </button>

                          {showHistory && (
                            <div className="mt-2 space-y-1 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                              {stats.records
                                .slice()
                                .sort((a, b) => b.date.localeCompare(a.date))
                                .map((r) => (
                                  <div
                                    key={r.id}
                                    className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between text-[10px]"
                                  >
                                    <div className="flex items-center gap-1.5 font-mono">
                                      <span className="text-slate-800 dark:text-slate-200 font-medium">{r.date}</span>
                                      {r.academicWeek && (
                                        <span className="text-slate-400">· W{r.academicWeek}</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {r.status === 'attended' && (
                                        <span className="px-1.5 py-0.2 rounded font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                          ✓ Attended
                                        </span>
                                      )}
                                      {r.status === 'missed' && (
                                        <span className="px-1.5 py-0.2 rounded font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                          ✕ Missed
                                        </span>
                                      )}
                                      {r.status === 'excused' && (
                                        <span className="px-1.5 py-0.2 rounded font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                          — Excused
                                        </span>
                                      )}
                                      {setAttendanceStatus && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const next: CommitmentStatus | null =
                                              r.status === 'attended' ? 'missed' : r.status === 'missed' ? 'excused' : 'attended';
                                            setAttendanceStatus(activeCourse.id, 'course', r.date, next, undefined, r.academicWeek);
                                          }}
                                          title="Cycle status"
                                          className="text-[9px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-1 py-0.2 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 cursor-pointer ml-1"
                                        >
                                          Change
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

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
          <div className="px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] sm:pb-3.5 sm:px-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs shrink-0 z-10">
            <button
              type="button"
              onClick={requestClose}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => {
                requestClose();
                onEdit(activeCourse);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Course</span>
            </button>
          </div>
        </>
      )}
    </ModalSheet>
  );
};
