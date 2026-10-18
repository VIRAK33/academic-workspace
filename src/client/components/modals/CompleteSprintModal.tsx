import React, { useState } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { Sprint } from '../../../types';
import { ModalSheet } from '../common/ModalSheet';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

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
    <ModalSheet isOpen={isOpen} onClose={onClose} maxWidthClass="sm:max-w-sm">
      {({ requestClose, dragHandleProps }) => (
        <form onSubmit={handleComplete} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
          {/* Draggable Header */}
          <div
            {...dragHandleProps}
            className="px-4 py-2.5 sm:px-5 sm:py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 cursor-grab active:cursor-grabbing select-none"
          >
            <div>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                Complete {sprint.name}
              </h3>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1 min-h-0">
            {/* Completion Summary Row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 space-y-0.5">
                <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-medium text-[10px]">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Completed</span>
                </div>
                <div className="text-base font-bold text-emerald-900 dark:text-emerald-100">
                  {completedCards.length}{' '}
                  <span className="text-[10px] font-normal text-emerald-700/80">
                    ({completedPoints}p)
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/40 space-y-0.5">
                <div className="flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium text-[10px]">
                  <AlertCircle className="w-3 h-3" />
                  <span>Incomplete</span>
                </div>
                <div className="text-base font-bold text-amber-900 dark:text-amber-100">
                  {incompleteCards.length}{' '}
                  <span className="text-[10px] font-normal text-amber-700/80">
                    ({totalPoints - completedPoints}p)
                  </span>
                </div>
              </div>
            </div>

            {/* Incomplete items rollover */}
            {incompleteCards.length > 0 && (
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Move {incompleteCards.length} unfinished item{incompleteCards.length > 1 ? 's' : ''} to:
                </label>
                <select
                  value={rolloverTarget}
                  onChange={(e) => setRolloverTarget(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="backlog">📋 Backlog (Unassigned)</option>
                  {plannedSprints.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      🏃 {sp.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Retrospective */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Sprint Retrospective / Takeaways (Optional)
              </label>
              <textarea
                rows={2}
                value={retrospective}
                onChange={(e) => setRetrospective(e.target.value)}
                placeholder="Key outcomes or notes from this sprint"
                className="w-full px-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 flex items-center justify-end gap-1.5 shrink-0">
            <button
              type="button"
              onClick={requestClose}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <span>Complete</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </form>
      )}
    </ModalSheet>
  );
};
