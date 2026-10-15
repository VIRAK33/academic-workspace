import React from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { KanbanStage, KanbanMilestone } from '../../../types';
import { Plus, ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';

interface ResearchKanbanViewProps {
  ws: ReturnType<typeof useWorkspace>;
  onOpenKanbanModal: () => void;
}

const KANBAN_STAGES: { id: KanbanStage; title: string }[] = [
  { id: 'lit_review', title: 'Literature Review' },
  { id: 'experiments', title: 'Experiments' },
  { id: 'drafting', title: 'Drafting' },
  { id: 'under_review', title: 'Under Review' },
];

export const ResearchKanbanView: React.FC<ResearchKanbanViewProps> = ({ ws, onOpenKanbanModal }) => {
  const { kanban, saveKanban, deleteKanban, searchQuery } = ws;

  const q = searchQuery.toLowerCase().trim();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Project Pipeline</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Track major assignments, projects, milestones, and drafts</p>
        </div>
        <button
          type="button"
          onClick={onOpenKanbanModal}
          className="px-3 py-1.5 rounded-md bg-slate-900 dark:bg-white hover:bg-slate-800 text-white dark:text-slate-900 text-xs font-medium transition flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Milestone</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {KANBAN_STAGES.map((col, colIdx) => {
          const cards = kanban.filter(item => {
            if (item.stage !== col.id) return false;
            if (q && !item.title.toLowerCase().includes(q) && !item.project.toLowerCase().includes(q)) return false;
            return true;
          });

          return (
            <div
              key={col.id}
              className="bg-slate-100/70 dark:bg-slate-800/40 rounded-lg border border-slate-200/80 dark:border-slate-800 p-3 space-y-2.5"
            >
              <div className="flex items-center justify-between px-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{col.title}</span>
                <span className="text-[11px] font-mono text-slate-400">{cards.length}</span>
              </div>

              <div className="space-y-2 min-h-[120px]">
                {cards.length === 0 ? (
                  <div className="h-24 rounded border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-[11px] text-slate-400">
                    Empty
                  </div>
                ) : (
                  cards.map(card => (
                    <div
                      key={card.id}
                      className="p-3 rounded-md bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {card.project}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 font-medium">{card.targetWeek}</span>
                      </div>
                      <h4 className="text-xs font-medium text-slate-900 dark:text-white leading-snug">
                        {card.title}
                      </h4>
                      {card.notes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{card.notes}</p>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1">
                          {colIdx > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const prevStage = KANBAN_STAGES[colIdx - 1].id;
                                saveKanban({ ...card, stage: prevStage });
                              }}
                              className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Move back"
                            >
                              <ArrowLeft className="w-3 h-3" />
                            </button>
                          )}
                          {colIdx < KANBAN_STAGES.length - 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextStage = KANBAN_STAGES[colIdx + 1].id;
                                saveKanban({ ...card, stage: nextStage });
                              }}
                              className="p-1 rounded text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                              title="Advance stage"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteKanban(card.id)}
                          className="text-slate-300 hover:text-rose-600 p-0.5 rounded transition"
                          title="Delete Milestone"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
