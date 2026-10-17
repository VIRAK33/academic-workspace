import React, { useState } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { TimeSlot } from '../../../types';
import { TimeInput } from '../common/TimeInput';
import { ModalSheet } from '../common/ModalSheet';

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
    <ModalSheet isOpen={isOpen} onClose={onClose} maxWidthClass="sm:max-w-md">
      {({ requestClose, dragHandleProps }) => (
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Draggable Header */}
          <div
            {...dragHandleProps}
            className="px-5 py-3 sm:px-6 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                University Session Slots
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Customize start and end times for scheduled class periods
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-2.5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
            {slots.map((s, idx) => (
              <div
                key={s.session}
                className="grid grid-cols-3 gap-2 items-center p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
              >
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

          {/* Footer */}
          <div className="px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] sm:pb-3.5 sm:px-6 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs flex items-center justify-end gap-2 shrink-0 z-10">
            <button
              type="button"
              onClick={requestClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700/60 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold transition shadow-xs cursor-pointer"
            >
              Save Slots
            </button>
          </div>
        </form>
      )}
    </ModalSheet>
  );
};

