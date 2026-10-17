import React from 'react';
import { ScheduleEvent } from '../../../types';
import { DAY_NAMES_FULL, format24To12Range, timeToMinutes } from '../../hooks/useWorkspace';
import { Pencil, Trash2, MapPin, Calendar, Clock, FileText } from 'lucide-react';
import { Twemoji } from '../common/Twemoji';
import { ModalSheet } from '../common/ModalSheet';

interface EventDetailsModalProps {
  event: ScheduleEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (event: ScheduleEvent) => void;
  onDelete?: (id: string) => void;
  currentAcademicWeek: number;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  event,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  currentAcademicWeek,
}) => {
  const [lastEvent, setLastEvent] = React.useState<ScheduleEvent | null>(event);
  React.useEffect(() => {
    if (event) setLastEvent(event);
  }, [event]);

  const activeEvent = event || lastEvent;
  if (!activeEvent) return null;

  const isRoutine = activeEvent.type === 'routine';
  const isAllDay = Boolean(activeEvent.isAllDay);
  const time12h = format24To12Range(activeEvent.startTime, activeEvent.endTime);
  const startMins = timeToMinutes(activeEvent.startTime);
  const endMins = timeToMinutes(activeEvent.endTime);
  const durationMins = isAllDay ? 1440 : Math.max(0, endMins - startMins);

  const isMultiDay = Boolean(!isRoutine && activeEvent.endDate && activeEvent.specificDate && activeEvent.endDate !== activeEvent.specificDate);
  let daysSpan = 1;
  if (isMultiDay && activeEvent.endDate && activeEvent.specificDate) {
    const d1 = new Date(activeEvent.specificDate + 'T00:00:00').getTime();
    const d2 = new Date(activeEvent.endDate + 'T00:00:00').getTime();
    daysSpan = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
  }

  const handleDelete = (requestClose: () => void) => {
    if (window.confirm(`Are you sure you want to delete "${activeEvent.title}"?`)) {
      if (onDelete) onDelete(activeEvent.id);
      requestClose();
    }
  };

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-md">
      {({ requestClose, dragHandleProps }) => (
        <>
          {/* Header Bar */}
          <div
            {...dragHandleProps}
            className="px-5 py-3 sm:px-6 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-white dark:bg-slate-900 relative shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
          >
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                    isRoutine
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : isMultiDay
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  <Twemoji emoji={isRoutine ? '🔁' : isMultiDay ? '🗓️' : '📅'} className="w-3 h-3" />
                  <span>{isRoutine ? 'Recurring Routine' : isMultiDay ? `Multi-Day (${daysSpan} Days)` : 'One-Off Event'}</span>
                </span>

                {isAllDay && (
                  <span className="font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                    All-Day
                  </span>
                )}

                {activeEvent.category && (
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {activeEvent.category}
                  </span>
                )}
              </div>

              <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: activeEvent.color || '#059669' }}
                />
                <span>{activeEvent.title}</span>
              </h3>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-3.5 overflow-y-auto custom-scrollbar flex-1 text-xs">
            {/* Time & Schedule Box */}
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                  <span>Scheduled Time</span>
                </div>
                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {isAllDay ? 'All Day (Full 24h)' : (
                    <>
                      {Math.floor(durationMins / 60) > 0 ? `${Math.floor(durationMins / 60)}h ` : ''}
                      {durationMins % 60 > 0 ? `${durationMins % 60}m` : ''}
                    </>
                  )}
                </span>
              </div>
              <div className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
                {isAllDay ? (
                  <span className="text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <span>All-Day Event</span>
                    <span className="text-xs font-normal text-slate-400 font-sans">· Full day commitment</span>
                  </span>
                ) : (
                  <>
                    {time12h} <span className="text-xs font-normal text-slate-400">({activeEvent.startTime}–{activeEvent.endTime})</span>
                  </>
                )}
              </div>
            </div>

            {/* Repeat / Date Information */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                <span>{isRoutine ? 'Days of the Week' : isMultiDay ? 'Multi-Day Date Span' : 'Calendar Date'}</span>
              </div>
              {isRoutine ? (
                <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  {activeEvent.daysOfWeek.map((d) => DAY_NAMES_FULL[d]).join(', ')}
                </div>
              ) : isMultiDay ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                      {activeEvent.specificDate} → {activeEvent.endDate}
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800/60">
                      {daysSpan} Days
                    </span>
                  </div>
                </div>
              ) : (
                <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  {activeEvent.specificDate}
                </div>
              )}
            </div>

            {/* Location */}
            {activeEvent.location && (
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>Location</span>
                </div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  {activeEvent.location}
                </div>
              </div>
            )}

            {/* Notes */}
            {activeEvent.notes && (
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-400" />
                  <span>Notes & Details</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                  {activeEvent.notes}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] sm:pb-3.5 sm:px-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs shrink-0 z-10">
            <div>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(requestClose)}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1.5 cursor-pointer"
                  title="Delete Commitment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
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
                  onEdit(activeEvent);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>
          </div>
        </>
      )}
    </ModalSheet>
  );
};
