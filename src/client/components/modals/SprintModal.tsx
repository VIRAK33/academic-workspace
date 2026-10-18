import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { Sprint } from '../../../types';
import { ModalSheet } from '../common/ModalSheet';
import { Calendar, Flag, Target } from 'lucide-react';

interface SprintModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
  initialSprint?: Sprint | null;
}

export const SprintModal: React.FC<SprintModalProps> = ({ ws, isOpen, onClose, initialSprint }) => {
  const { viewedSemester, saveSprint, sprints } = ws;

  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (initialSprint) {
      setName(initialSprint.name);
      setGoal(initialSprint.goal || '');
      setStartDate(initialSprint.startDate);
      setEndDate(initialSprint.endDate);
    } else {
      // Default to next sprint number and 2-week span
      const nextNum = sprints.length + 1;
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const twoWeeksLater = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
      const endStr = twoWeeksLater.toISOString().split('T')[0];

      setName(`Sprint ${nextNum}`);
      setGoal('');
      setStartDate(todayStr);
      setEndDate(endStr);
    }
  }, [initialSprint, isOpen, sprints.length]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) return;

    const sprintData: Sprint = {
      id: initialSprint ? initialSprint.id : 'sp_' + Date.now().toString(36),
      semesterId: viewedSemester?.id,
      name: name.trim(),
      goal: goal.trim() || undefined,
      startDate,
      endDate,
      status: initialSprint ? initialSprint.status : 'planned',
      velocityPoints: initialSprint?.velocityPoints || 0,
      retrospective: initialSprint?.retrospective,
    };

    await saveSprint(sprintData);
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
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {initialSprint ? 'Edit Sprint' : 'Create New Sprint'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Time-boxed deliverable cycle with a focused research goal
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0 text-xs">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Sprint Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sprint 2: Baseline Benchmark & Rebuttal"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Sprint Goal
              </label>
              <textarea
                rows={2}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="What is the primary deliverable or outcome by the end of this sprint?"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Start Date</span>
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Flag className="w-3 h-3 text-slate-400" />
                  <span>End Date</span>
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] sm:pb-3.5 sm:px-6 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs flex items-center justify-end gap-2 shrink-0 z-10">
            <button
              type="button"
              onClick={requestClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs cursor-pointer"
            >
              {initialSprint ? 'Save Changes' : 'Create Sprint'}
            </button>
          </div>
        </form>
      )}
    </ModalSheet>
  );
};
