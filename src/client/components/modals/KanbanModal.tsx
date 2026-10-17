import React, { useState } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { KanbanMilestone, KanbanStage } from '../../../types';
import { ModalSheet } from '../common/ModalSheet';

interface KanbanModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
}

export const KanbanModal: React.FC<KanbanModalProps> = ({ ws, isOpen, onClose }) => {
  const { viewedSemester, saveKanban } = ws;

  const [title, setTitle] = useState('');
  const [stage, setStage] = useState<KanbanStage>('experiments');
  const [targetWeek, setTargetWeek] = useState('W6');
  const [project, setProject] = useState('Graph-RAG Paper');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newMilestone: KanbanMilestone = {
      id: 'k_' + Date.now().toString(36),
      semesterId: viewedSemester.id,
      title: title.trim(),
      stage,
      targetWeek: targetWeek.trim(),
      project: project.trim(),
      notes: notes.trim() || undefined,
    };

    saveKanban(newMilestone);
    setTitle('');
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
                New Research Milestone
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Track deliverables, experiments, drafts, and submissions
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-3.5 overflow-y-auto custom-scrollbar flex-1 min-h-0 text-xs">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Deliverable Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Run multi-hop QA benchmark on Graph-RAG"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Stage
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="lit_review">Literature Review</option>
                  <option value="experiments">Experiments</option>
                  <option value="drafting">Drafting</option>
                  <option value="under_review">Under Review</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Week
                </label>
                <input
                  type="text"
                  required
                  value={targetWeek}
                  onChange={(e) => setTargetWeek(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Project Tag
              </label>
              <input
                type="text"
                required
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Notes / Details
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Include baseline comparisons with 3-hop retrieval"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
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
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 transition shadow-xs cursor-pointer"
            >
              Add Milestone
            </button>
          </div>
        </form>
      )}
    </ModalSheet>
  );
};
