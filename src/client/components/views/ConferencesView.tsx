import React from 'react';
import { useWorkspace, parseIsoDate } from '../../hooks/useWorkspace';
import { Plus, Trophy, Calendar, Clock, Trash2 } from 'lucide-react';

interface ConferencesViewProps {
  ws: ReturnType<typeof useWorkspace>;
  onOpenConferenceModal: () => void;
}

export const ConferencesView: React.FC<ConferencesViewProps> = ({ ws, onOpenConferenceModal }) => {
  const { conferences, deleteConference, saveConference } = ws;

  const now = new Date();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Conference & Journal Deadlines</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Track target submission deadlines, paper drafting milestones, and rebuttals</p>
        </div>
        <button
          type="button"
          onClick={onOpenConferenceModal}
          className="px-3 py-1.5 rounded-md bg-slate-900 dark:bg-white hover:bg-slate-800 text-white dark:text-slate-900 text-xs font-medium transition flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Conference</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {conferences.length === 0 ? (
          <div className="md:col-span-2 py-16 text-center text-xs text-slate-400 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            No conference deadlines tracked yet. Click "Add Conference" to track your first venue!
          </div>
        ) : (
          conferences.map((conf) => {
            const target = parseIsoDate(conf.submissionDeadline);
            const diffDays = Math.ceil((target.getTime() - now.getTime()) / 86400000);
            const isPassed = diffDays < 0;

            return (
              <div
                key={conf.id}
                className="p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {conf.acronym}
                      </h3>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {conf.tier || 'Core A*'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      {conf.name}
                    </p>
                  </div>

                  {/* Countdown Badge */}
                  <div className={`px-3 py-1.5 rounded-md text-center font-mono shrink-0 border ${
                    isPassed
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                      : diffDays <= 14
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800 animate-pulse'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  }`}>
                    <div className="text-sm font-bold tabular-nums">
                      {isPassed ? 'PASSED' : `D-${diffDays}`}
                    </div>
                    <div className="text-[10px] uppercase font-semibold">
                      {isPassed ? 'Concluded' : 'Days Left'}
                    </div>
                  </div>
                </div>

                {/* Deadlines Timeline */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Full Paper</div>
                    <div className="font-mono text-slate-800 dark:text-slate-200 font-medium tabular-nums mt-0.5">
                      {conf.submissionDeadline}
                    </div>
                  </div>
                  {conf.abstractDeadline && (
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Abstract</div>
                      <div className="font-mono text-slate-800 dark:text-slate-200 font-medium tabular-nums mt-0.5">
                        {conf.abstractDeadline}
                      </div>
                    </div>
                  )}
                  {conf.rebuttalDeadline && (
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Rebuttal</div>
                      <div className="font-mono text-slate-800 dark:text-slate-200 font-medium tabular-nums mt-0.5">
                        {conf.rebuttalDeadline}
                      </div>
                    </div>
                  )}
                </div>

                {conf.paperTitle && (
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-medium text-slate-500">Target Paper: </span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">"{conf.paperTitle}"</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Status:</span>
                    <select
                      value={conf.status}
                      onChange={(e) => saveConference({ ...conf, status: e.target.value as any })}
                      className="bg-transparent font-medium text-slate-700 dark:text-slate-300 capitalize cursor-pointer focus:outline-none"
                    >
                      <option value="preparing">Preparing</option>
                      <option value="submitted">Submitted</option>
                      <option value="rebuttal">Rebuttal</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteConference(conf.id)}
                    className="text-slate-300 hover:text-rose-600 p-1 rounded transition"
                    title="Delete Conference"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
