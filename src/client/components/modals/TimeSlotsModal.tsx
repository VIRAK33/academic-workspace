import React, { useState } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { X } from 'lucide-react';
import { TimeSlot } from '../../../types';

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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-xl sm:rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">University Session Slots</h3>
          <button type="button" onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="space-y-2">
            {slots.map((s, idx) => (
              <div key={s.session} className="grid grid-cols-3 gap-2 items-center p-2 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                  Session {s.session}
                </div>
                <input
                  type="time"
                  value={s.startTime}
                  onChange={(e) => {
                    const next = [...slots];
                    next[idx] = { ...next[idx], startTime: e.target.value };
                    setSlots(next);
                  }}
                  className="w-full px-2 py-1 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <input
                  type="time"
                  value={s.endTime}
                  onChange={(e) => {
                    const next = [...slots];
                    next[idx] = { ...next[idx], endTime: e.target.value };
                    setSlots(next);
                  }}
                  className="w-full px-2 py-1 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              className="px-3 py-1.5 rounded bg-slate-900 dark:bg-white hover:bg-slate-800 text-white dark:text-slate-900 text-xs font-medium transition"
            >
              Save Slots
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
