import React from 'react';
import { Terminal, Copy } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { ModalSheet } from '../common/ModalSheet';

interface CliCheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  ws: ReturnType<typeof useWorkspace>;
}

export const CliCheatSheetModal: React.FC<CliCheatSheetModalProps> = ({ isOpen, onClose, ws }) => {
  const { showToast } = ws;

  if (!isOpen) return null;

  const copyCmd = (cmd: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cmd);
      showToast(`Copied: ${cmd}`);
    }
  };

  const commands = [
    {
      cmd: 'aw today',
      desc: 'Shows academic week, classes scheduled today, session rooms, and tasks due.',
    },
    {
      cmd: 'aw task add "Review draft" --due tomorrow --tag #Coursework',
      desc: 'Adds a task from terminal.',
    },
    {
      cmd: 'aw task list --pending',
      desc: 'Lists uncompleted tasks.',
    },
    {
      cmd: 'aw paper list',
      desc: 'Displays papers in reading queue with venue, tags, and reading status.',
    },
    {
      cmd: 'aw paper bibtex p1 | pbcopy',
      desc: 'Copies LaTeX BibTeX snippet directly to clipboard.',
    },
    {
      cmd: 'aw exp log --name "Attn-k16" --dataset HotpotQA --metric f1=86.4',
      desc: 'Logs experiment run (ideal at the end of python train.py).',
    },
    {
      cmd: 'aw conf',
      desc: 'Displays live D-day countdown table for conference & competition deadlines.',
    },
    {
      cmd: 'aw digest | pbcopy',
      desc: 'Generates weekly progress report in Markdown for your advisor or personal review.',
    },
    {
      cmd: 'aw mode basic | aw mode research',
      desc: 'Toggles between 3-tab Basic student view and full 8-tab Advanced suite.',
    },
  ];

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} maxWidthClass="sm:max-w-xl">
      {({ requestClose, dragHandleProps }) => (
        <>
          {/* Draggable Header */}
          <div
            {...dragHandleProps}
            className="px-5 py-3 sm:px-6 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
          >
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  aw Terminal CLI Reference
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Command-line interface commands for high-speed workspace interactions
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0 space-y-3.5">
            <div className="p-3 rounded-lg bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-200">
              <strong>How to link locally:</strong> Run <code className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">npm link</code> in this workspace directory to enable the global <code className="font-mono font-bold">aw</code> command everywhere in your terminal.
            </div>

            <div className="space-y-2.5">
              {commands.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs font-mono font-semibold text-slate-900 dark:text-white select-all">
                      {item.cmd}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyCmd(item.cmd)}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                      title="Copy command"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] sm:pb-3.5 sm:px-6 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs flex items-center justify-end shrink-0 z-10">
            <button
              type="button"
              onClick={requestClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold transition shadow-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </>
      )}
    </ModalSheet>
  );
};
