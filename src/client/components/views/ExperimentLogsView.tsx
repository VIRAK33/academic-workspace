import React from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { Plus, FlaskConical, Terminal, ExternalLink } from 'lucide-react';

interface ExperimentLogsViewProps {
  ws: ReturnType<typeof useWorkspace>;
  onOpenExperimentModal: () => void;
}

export const ExperimentLogsView: React.FC<ExperimentLogsViewProps> = ({ ws, onOpenExperimentModal }) => {
  const { experimentLogs, searchQuery, showToast } = ws;

  const q = searchQuery.toLowerCase().trim();

  const filteredLogs = experimentLogs.filter(exp => {
    if (q && !exp.name.toLowerCase().includes(q) && !exp.projectTag.toLowerCase().includes(q) && !(exp.notes || '').toLowerCase().includes(q)) return false;
    return true;
  });

  const handleCopyCliSnippet = () => {
    const cmd = `phd exp log --name "Exp-Ablation" --project "Graph-RAG" --dataset "HotpotQA" --metric f1=88.5 --notes "Improved edge pruning"`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cmd);
      showToast('Copied CLI training command snippet!');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Experiment & Compute Logs</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Log model training runs, benchmark evaluations, and ablation studies</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCliSnippet}
            className="px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono font-medium transition flex items-center gap-1.5"
            title="Copy CLI command for Python training script"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Copy Python/Bash Snippet</span>
          </button>
          <button
            type="button"
            onClick={onOpenExperimentModal}
            className="px-3 py-1.5 rounded-md bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium transition shadow-xs flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Run</span>
          </button>
        </div>
      </div>

      {/* Experiment Runs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-4 font-medium">Run Name</th>
                <th className="py-2.5 px-3 font-medium">Project</th>
                <th className="py-2.5 px-3 font-medium">Dataset</th>
                <th className="py-2.5 px-4 font-medium">Evaluation Metrics</th>
                <th className="py-2.5 px-4 font-medium">Findings & Notes</th>
                <th className="py-2.5 px-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    No experiment logs recorded. Run a training script or click "Log Run" to begin!
                  </td>
                </tr>
              ) : (
                filteredLogs.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
                        <span>{exp.name}</span>
                      </div>
                      {exp.hypothesis && (
                        <div className="text-[11px] text-slate-400 mt-0.5 font-normal">
                          Hypothesis: {exp.hypothesis}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {exp.projectTag}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                      {exp.dataset || 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800 dark:text-slate-200">
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(exp.metrics || {}).map(([k, v]) => (
                          <span
                            key={k}
                            className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[11px]"
                          >
                            <strong>{k}:</strong> {String(v)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {exp.notes || '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase">
                        {exp.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
