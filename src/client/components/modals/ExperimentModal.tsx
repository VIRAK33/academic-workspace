import React, { useState } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { ExperimentLog } from '../../../types';
import { ModalSheet } from '../common/ModalSheet';

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
                Log Experiment Run
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Record benchmark results, hypotheses, datasets, and metrics
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-3.5 overflow-y-auto custom-scrollbar flex-1 min-h-0 text-xs">
            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Run Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Project Tag
                </label>
                <input
                  type="text"
                  required
                  value={projectTag}
                  onChange={(e) => setProjectTag(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Hypothesis / Goal
              </label>
              <input
                type="text"
                value={hypothesis}
                onChange={(e) => setHypothesis(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Dataset / Benchmark
              </label>
              <input
                type="text"
                value={dataset}
                onChange={(e) => setDataset(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Evaluation Metrics (key: val, key: val)
              </label>
              <input
                type="text"
                value={metricsStr}
                onChange={(e) => setMetricsStr(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Findings & Observations
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
              Record Run
            </button>
          </div>
        </form>
      )}
    </ModalSheet>
  );
};
