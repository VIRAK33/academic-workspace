import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { Copy, Check } from 'lucide-react';
import { api } from '../../api';
import { ModalSheet } from '../common/ModalSheet';

interface WeeklyDigestModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
}

export const WeeklyDigestModal: React.FC<WeeklyDigestModalProps> = ({ ws, isOpen, onClose }) => {
  const { showToast } = ws;
  const [digest, setDigest] = useState('Loading digest...');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getWeeklyDigest().then(d => setDigest(d));
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(digest);
      setCopied(true);
      showToast('Weekly report copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} maxWidthClass="sm:max-w-2xl">
      {({ requestClose, dragHandleProps }) => (
        <>
          {/* Draggable Header */}
          <div
            {...dragHandleProps}
            className="px-5 py-3 sm:px-6 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Advisor Weekly Progress Digest
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                1-Click Compiled
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0 space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Auto-pulled from completed tasks, recent experiment runs, and literature notes. Ready to paste into an email or meeting doc.
            </p>
            <textarea
              rows={13}
              value={digest}
              onChange={(e) => setDigest(e.target.value)}
              className="w-full p-3.5 rounded-lg bg-slate-950 text-slate-200 font-mono text-xs leading-relaxed border border-slate-800 focus:outline-none focus:border-slate-700"
            />
          </div>

          {/* Footer */}
          <div className="px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] sm:pb-3.5 sm:px-6 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs flex items-center justify-between shrink-0 z-10">
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">Tip: Or run `aw digest | pbcopy`</span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
              </button>
              <button
                type="button"
                onClick={requestClose}
                className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </ModalSheet>
  );
};
