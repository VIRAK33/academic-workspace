import React, { useState } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { X } from 'lucide-react';
import { Conference } from '../../../types';

interface ConferenceModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
}

export const ConferenceModal: React.FC<ConferenceModalProps> = ({ ws, isOpen, onClose }) => {
  const { saveConference } = ws;

  const [name, setName] = useState('');
  const [acronym, setAcronym] = useState('ICLR 2027');
  const [tier, setTier] = useState('CCF-A / Core A*');
  const [abstractDeadline, setAbstractDeadline] = useState('2026-09-25');
  const [submissionDeadline, setSubmissionDeadline] = useState('2026-10-02');
  const [rebuttalDeadline, setRebuttalDeadline] = useState('2026-11-20');
  const [paperTitle, setPaperTitle] = useState('Hybrid Sparse-Dense Graph RAG');
  const [status, setStatus] = useState<Conference['status']>('preparing');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acronym.trim() || !submissionDeadline) return;

    const newConf: Conference = {
      id: 'conf_' + Date.now().toString(36),
      name: name.trim() || acronym.trim(),
      acronym: acronym.trim(),
      tier: tier.trim(),
      abstractDeadline: abstractDeadline || undefined,
      submissionDeadline,
      rebuttalDeadline: rebuttalDeadline || undefined,
      paperTitle: paperTitle.trim() || undefined,
      status,
    };

    saveConference(newConf);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-xl sm:rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Track Conference Deadline</h3>
          <button type="button" onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Acronym</label>
              <input
                type="text"
                required
                value={acronym}
                onChange={(e) => setAcronym(e.target.value)}
                placeholder="ICLR 2027"
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tier / Ranking</label>
              <input
                type="text"
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                placeholder="CCF-A / Core A*"
                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Full Conference Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="International Conference on Learning Representations"
              className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Full Paper Deadline</label>
              <input
                type="date"
                required
                value={submissionDeadline}
                onChange={(e) => setSubmissionDeadline(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Abstract Deadline</label>
              <input
                type="date"
                value={abstractDeadline}
                onChange={(e) => setAbstractDeadline(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Target Paper in Drafting</label>
            <input
              type="text"
              value={paperTitle}
              onChange={(e) => setPaperTitle(e.target.value)}
              placeholder="e.g. Hierarchical Graph-RAG"
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
              Save Conference
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
