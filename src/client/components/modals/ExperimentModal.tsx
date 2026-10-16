import React, { useState } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { X } from 'lucide-react';
import { ExperimentLog } from '../../../types';

interface ExperimentModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
}

export const ExperimentModal: React.FC<ExperimentModalProps> = ({ ws, isOpen, onClose }) => {
  const { saveExperiment } = ws;

  const [name, setName] = useState('Exp-03: Edge Sparsity Threshold');
  const [projectTag, setProjectTag] = useState('Graph-RAG');
  const [hypothesis, setHypothesis] = useState('Thresholding edge weights < 0.2 reduces latency by 35%');
  const [dataset, setDataset] = useState('HotpotQA');
  const [metricsStr, setMetricsStr] = useState('f1: 85.2, recall: 88.0, latency_ms: 74');
  const [notes, setNotes] = useState('Tested with 3-hop subgraph community extraction.');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const metrics: Record<string, any> = {};
    metricsStr.split(',').forEach(part => {
      const [k, v] = part.split(':').map(s => s.trim());
      if (k && v) {
        metrics[k] = isNaN(Number(v)) ? v : Number(v);
      }
    });

    const newExp: ExperimentLog = {
      id: 'exp_' + Date.now().toString(36),
      name: name.trim(),
      projectTag: projectTag.trim(),
      hypothesis: hypothesis.trim() || undefined,
      dataset: dataset.trim() || undefined,
      metrics,
      status: 'completed',
      notes: notes.trim() || undefined,
    };

    saveExperiment(newExp);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-xl sm:rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Log Experiment Run</h3>
          <button type="button" onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Run Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Project Tag</label>
              <input
                type="text"
                required
                value={projectTag}
                onChange={(e) => setProjectTag(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Hypothesis / Goal</label>
            <input
              type="text"
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Dataset / Benchmark</label>
            <input
              type="text"
              value={dataset}
              onChange={(e) => setDataset(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Evaluation Metrics (key: val, key: val)</label>
            <input
              type="text"
              value={metricsStr}
              onChange={(e) => setMetricsStr(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Findings & Observations</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 transition shadow-xs"
            >
              Record Run
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
