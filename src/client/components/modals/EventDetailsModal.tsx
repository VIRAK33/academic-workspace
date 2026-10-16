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
  const time12h = format24To12Range(event.startTime, event.endTime);
  const startMins = timeToMinutes(event.startTime);
  const endMins = timeToMinutes(event.endTime);
  const durationMins = Math.max(0, endMins - startMins);

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${event.title}"?`)) {
      if (onDelete) onDelete(event.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85dvh] sm:max-h-[88vh] animate-in fade-in zoom-in-95 duration-100">
        
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
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                <Twemoji emoji={isRoutine ? '🔁' : '📅'} className="w-3 h-3" />
                <span>{isRoutine ? 'Recurring Routine' : 'One-Off Event'}</span>
              </span>

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
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
              {durationMins > 0 && (
                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {Math.floor(durationMins / 60) > 0 ? `${Math.floor(durationMins / 60)}h ` : ''}
                  {durationMins % 60 > 0 ? `${durationMins % 60}m` : ''}
                </span>
              )}
            </div>
            <div className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {time12h} <span className="text-xs font-normal text-slate-400">({event.startTime}–{event.endTime})</span>
            </div>
          </div>

          {/* Repeat / Date Information */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-500 dark:text-slate-400" />
              <span>{isRoutine ? 'Days of the Week' : 'Calendar Date'}</span>
            </div>
            <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
              {isRoutine
                ? event.daysOfWeek.map((d) => DAY_NAMES_FULL[d]).join(', ')
                : event.specificDate}
            </div>
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
        <div className="px-4 py-3 sm:px-5 sm:py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
          <div>
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1"
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
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(event);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 transition flex items-center gap-1.5 shadow-xs"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
