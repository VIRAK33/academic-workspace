import React, { useState } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { Conference } from '../../../types';
import { ModalSheet } from '../common/ModalSheet';

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
                Track Conference Deadline
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Track submission dates, abstract cutoffs, and D-day countdowns
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-3.5 overflow-y-auto custom-scrollbar flex-1 min-h-0 text-xs">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Acronym
                </label>
                <input
                  type="text"
                  required
                  value={acronym}
                  onChange={(e) => setAcronym(e.target.value)}
                  placeholder="ICLR 2027"
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tier / Ranking
                </label>
                <input
                  type="text"
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  placeholder="CCF-A / Core A*"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Conference Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="International Conference on Learning Representations"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Paper Deadline
                </label>
                <input
                  type="date"
                  required
                  value={submissionDeadline}
                  onChange={(e) => setSubmissionDeadline(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Abstract Deadline
                </label>
                <input
                  type="date"
                  value={abstractDeadline}
                  onChange={(e) => setAbstractDeadline(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Target Paper in Drafting
              </label>
              <input
                type="text"
                value={paperTitle}
                onChange={(e) => setPaperTitle(e.target.value)}
                placeholder="e.g. Hierarchical Graph-RAG"
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
              Save Conference
            </button>
          </div>
        </form>
      )}
    </ModalSheet>
  );
};
