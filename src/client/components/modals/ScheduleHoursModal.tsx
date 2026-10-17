import React, { useState, useEffect } from 'react';
import { RotateCcw, Check } from 'lucide-react';
import { format12HourTime } from '../../hooks/useWorkspace';
import { ModalSheet } from '../common/ModalSheet';

interface ScheduleHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  startHour: number;
  endHour: number;
  onSave: (start: number, end: number) => void;
}

const START_HOUR_OPTIONS = [
  { value: 5, label: '5:00 AM' },
  { value: 6, label: '6:00 AM' },
  { value: 7, label: '7:00 AM' },
  { value: 8, label: '8:00 AM (Default)' },
  { value: 9, label: '9:00 AM' },
  { value: 10, label: '10:00 AM' },
];

const END_HOUR_OPTIONS = [
  { value: 18, label: '6:00 PM' },
  { value: 19, label: '7:00 PM' },
  { value: 20, label: '8:00 PM' },
  { value: 21, label: '9:00 PM' },
  { value: 21.5, label: '9:30 PM (Default)' },
  { value: 22, label: '10:00 PM' },
  { value: 22.5, label: '10:30 PM' },
  { value: 23, label: '11:00 PM' },
  { value: 23.5, label: '11:30 PM' },
  { value: 24, label: '12:00 AM (Midnight)' },
];

const PRESETS = [
  { label: 'Full Day', start: 7, end: 23, desc: '7:00 AM – 11:00 PM' },
  { label: 'Standard', start: 8, end: 21.5, desc: '8:00 AM – 9:30 PM' },
  { label: 'Early Bird', start: 6, end: 22, desc: '6:00 AM – 10:00 PM' },
  { label: 'Night Owl', start: 9, end: 24, desc: '9:00 AM – Midnight' },
];

export const ScheduleHoursModal: React.FC<ScheduleHoursModalProps> = ({
  isOpen,
  onClose,
  startHour,
  endHour,
  onSave,
}) => {
  const [selectedStart, setSelectedStart] = useState<number>(startHour);
  const [selectedEnd, setSelectedEnd] = useState<number>(endHour);

  useEffect(() => {
    if (isOpen) {
      setSelectedStart(startHour);
      setSelectedEnd(endHour);
    }
  }, [isOpen, startHour, endHour]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStart >= selectedEnd) {
      return;
    }
    onSave(selectedStart, selectedEnd);
    onClose();
  };

  const handleReset = () => {
    setSelectedStart(8);
    setSelectedEnd(21.5);
  };

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} maxWidthClass="sm:max-w-md">
      {({ requestClose, dragHandleProps }) => (
        <>
          {/* Header */}
          <div
            {...dragHandleProps}
            className="px-4 py-2.5 sm:px-5 sm:py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Schedule Display Hours
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Customize daily active timeline window
              </p>
            </div>
          </div>

          {/* Content Form */}
          <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1 min-h-0">
              {/* Presets */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Quick Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((p) => {
                    const isActive = selectedStart === p.start && selectedEnd === p.end;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setSelectedStart(p.start);
                          setSelectedEnd(p.end);
                        }}
                        className={`p-2 rounded-lg text-left border transition flex flex-col justify-between cursor-pointer ${
                          isActive
                            ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white ring-1 ring-slate-900/20 dark:ring-white/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">{p.label}</span>
                          {isActive && <Check className="w-3.5 h-3.5 text-slate-900 dark:text-white" />}
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                          {p.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time pickers */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label htmlFor="scheduleStartHourSelect" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Day Start Hour
                  </label>
                  <select
                    id="scheduleStartHourSelect"
                    value={selectedStart}
                    onChange={(e) => setSelectedStart(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition"
                  >
                    {START_HOUR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="scheduleEndHourSelect" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Day End Hour
                  </label>
                  <select
                    id="scheduleEndHourSelect"
                    value={selectedEnd}
                    onChange={(e) => setSelectedEnd(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition"
                  >
                    {END_HOUR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Current Selection Preview */}
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500 dark:text-slate-400">Timeline Window:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {format12HourTime(selectedStart * 60, false)} – {format12HourTime(selectedEnd * 60, false)}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                💡 If any classes, routines, or events fall earlier or later on a specific day, the timeline automatically extends to guarantee nothing is clipped.
              </p>
            </div>

            {/* Footer Actions */}
            <div className="px-4 py-2.5 sm:px-5 sm:py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs shrink-0 z-10">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1.5 px-2 py-1 rounded transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={requestClose}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-xs transition cursor-pointer"
                >
                  Save Hours
                </button>
              </div>
            </div>
          </form>
        </>
      )}
    </ModalSheet>
  );
};
