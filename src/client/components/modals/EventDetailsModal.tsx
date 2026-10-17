import React from 'react';
import { ScheduleEvent } from '../../../types';
import { DAY_NAMES_FULL, format24To12Range, timeToMinutes } from '../../hooks/useWorkspace';
import { X, Pencil, Trash2, MapPin, Calendar, Clock, FileText } from 'lucide-react';
import { Twemoji } from '../common/Twemoji';

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
  if (!isOpen || !event) return null;

  const isRoutine = event.type === 'routine';
  const isAllDay = Boolean(event.isAllDay);
  const time12h = format24To12Range(event.startTime, event.endTime);
  const startMins = timeToMinutes(event.startTime);
  const endMins = timeToMinutes(event.endTime);
  const durationMins = isAllDay ? 1440 : Math.max(0, endMins - startMins);

  const isMultiDay = Boolean(!isRoutine && event.endDate && event.specificDate && event.endDate !== event.specificDate);
  const daysSpan = React.useMemo(() => {
    if (!isMultiDay || !event.endDate || !event.specificDate) return 1;
    const d1 = new Date(event.specificDate + 'T00:00:00').getTime();
    const d2 = new Date(event.endDate + 'T00:00:00').getTime();
    return Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
  }, [isMultiDay, event.specificDate, event.endDate]);

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${event.title}"?`)) {
      if (onDelete) onDelete(event.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-2xl sm:rounded-xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh] animate-in fade-in duration-100">
        {/* Mobile Sheet Drag Indicator */}
        <div className="pt-2.5 pb-0.5 flex justify-center sm:hidden shrink-0">
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>
        
        {/* Header Bar */}
        <div
          className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/60 dark:bg-slate-800/40 relative shrink-0"
          style={{ borderTopWidth: '4px', borderTopColor: event.color || '#059669' }}
        >
          <div className="space-y-1.5 pr-6">
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

              {event.category && (
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {event.category}
                </span>
              )}
            </div>

            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
              {event.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3.5 sm:p-5 space-y-3 sm:space-y-3.5 overflow-y-auto custom-scrollbar flex-1 text-xs">
          
          {/* Time & Schedule Box */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
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
            <div className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {isAllDay ? (
                <span className="text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <span>All-Day Event</span>
                  <span className="text-xs font-normal text-slate-400 font-sans">· Full day commitment</span>
                </span>
              ) : (
                <>
                  {time12h} <span className="text-xs font-normal text-slate-400">({event.startTime}–{event.endTime})</span>
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
                {event.daysOfWeek.map((d) => DAY_NAMES_FULL[d]).join(', ')}
              </div>
            ) : isMultiDay ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                    {event.specificDate} → {event.endDate}
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800/60">
                    {daysSpan} Days
                  </span>
                </div>
              </div>
            ) : (
              <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                {event.specificDate}
              </div>
            )}
          </div>

          {/* Location */}
          {event.location && (
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>Location</span>
              </div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                {event.location}
              </div>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-400" />
                <span>Notes & Details</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                {event.notes}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs shrink-0 z-10">
          <div>
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1.5 min-h-[42px] sm:min-h-0"
                title="Delete Commitment"
              >
                <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 sm:px-3.5 sm:py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-[42px] sm:min-h-0"
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(event);
              }}
              className="px-4 py-2 sm:px-3.5 sm:py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 transition flex items-center gap-1.5 shadow-xs min-h-[42px] sm:min-h-0"
            >
              <Pencil className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span>Edit</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
