import React, { useState } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { Sprint } from '../../../types';
import { ModalSheet } from '../common/ModalSheet';
import { CheckCircle2, AlertCircle, ArrowRight, Trophy } from 'lucide-react';

interface CompleteSprintModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
  sprint: Sprint | null;
}

export const CompleteSprintModal: React.FC<CompleteSprintModalProps> = ({ ws, isOpen, onClose, sprint }) => {
  const { sprints, kanban, completeSprint } = ws;

  const [rolloverTarget, setRolloverTarget] = useState<string>('backlog');
  const [retrospective, setRetrospective] = useState<string>('');

  if (!isOpen || !sprint) return null;

  const sprintCards = kanban.filter((k) => k.sprintId === sprint.id);
  const completedCards = sprintCards.filter((k) => k.stage === 'done' || k.stage === 'under_review');
  const incompleteCards = sprintCards.filter((k) => k.stage !== 'done' && k.stage !== 'under_review');

  const completedPoints = completedCards.reduce((acc, c) => acc + (c.storyPoints || 1), 0);
  const totalPoints = sprintCards.reduce((acc, c) => acc + (c.storyPoints || 1), 0);

  const plannedSprints = sprints.filter((s) => s.id !== sprint.id && s.status === 'planned');

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSprintId = rolloverTarget === 'backlog' ? undefined : rolloverTarget;
    await completeSprint(sprint.id, targetSprintId);
    onClose();
  };

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} maxWidthClass="sm:max-w-md">
      {({ requestClose, dragHandleProps }) => (
        <form onSubmit={handleComplete} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Draggable Header */}
          <div
            {...dragHandleProps}
            className="px-5 py-3 sm:px-6 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Complete {sprint.name}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Review deliverables and roll over unfinished tasks
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0 text-xs">
            {/* Completion Summary Card */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-medium text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Completed</span>
                </div>
                <div className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                  {completedCards.length}{' '}
                  <span className="text-xs font-normal text-emerald-700/80 dark:text-emerald-300/80">
                    ({completedPoints} pts)
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-medium text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Incomplete</span>
                </div>
                <div className="text-xl font-bold text-amber-900 dark:text-amber-100">
                  {incompleteCards.length}{' '}
                  <span className="text-xs font-normal text-amber-700/80 dark:text-amber-300/80">
                    ({totalPoints - completedPoints} pts)
                  </span>
                </div>
              </div>
            </div>

            {/* Incomplete items rollover */}
            {incompleteCards.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Move {incompleteCards.length} unfinished deliverable{incompleteCards.length > 1 ? 's' : ''} to:
                </label>
                <div className="space-y-2">
                  <select
                    value={rolloverTarget}
                    onChange={(e) => setRolloverTarget(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="backlog">📋 Backlog (Unscheduled ideas)</option>
                    {plannedSprints.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        🏃 {sp.name} ({sp.startDate} - {sp.endDate})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Retrospective notes */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Sprint Retrospective / Takeaways (Optional)
              </label>
              <textarea
                rows={2}
                value={retrospective}
                onChange={(e) => setRetrospective(e.target.value)}
                placeholder="What went well? Any paper ideas or experiments to remember?"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
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
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Complete Sprint</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      )}
    </ModalSheet>
  );
};
