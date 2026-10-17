import React, { useState } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { X } from 'lucide-react';
import { TimeSlot } from '../../../types';
import { TimeInput } from '../common/TimeInput';

interface TimeSlotsModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
}

export const TimeSlotsModal: React.FC<TimeSlotsModalProps> = ({ ws, isOpen, onClose }) => {
  const { timeSlots, saveTimeSlots } = ws;
  const [slots, setSlots] = useState<TimeSlot[]>(timeSlots);

  React.useEffect(() => {
    setSlots(timeSlots);
  }, [timeSlots]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveTimeSlots(slots);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-xl sm:rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[85dvh] sm:max-h-[88vh] flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">University Session Slots</h3>
          <button type="button" onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3.5 sm:p-4 space-y-3 flex-1 flex flex-col overflow-hidden">
          <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-0.5">
            {slots.map((s, idx) => (
              <div key={s.session} className="grid grid-cols-3 gap-2 items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                  Session {s.session}
                </div>
                <TimeInput
                  value={s.startTime}
                  onChange={(val) => {
                    const next = [...slots];
                    next[idx] = { ...next[idx], startTime: val };
                    setSlots(next);
                  }}
                />
                <TimeInput
                  value={s.endTime}
                  onChange={(val) => {
                    const next = [...slots];
                    next[idx] = { ...next[idx], endTime: val };
                    setSlots(next);
                  }}
                />
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-md bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold transition shadow-xs"
            >
              Save Slots
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
