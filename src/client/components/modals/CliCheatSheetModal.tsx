import React from 'react';
import { X, Terminal, Copy } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';

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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              `aw` Terminal CLI Command Reference
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          <div className="p-3 rounded bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-200">
            <strong>How to link locally:</strong> Run <code className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">npm link</code> in this workspace directory to enable the global <code className="font-mono font-bold">aw</code> command everywhere in your terminal.
          </div>

          <div className="space-y-3">
            {commands.map((item, idx) => (
              <div key={idx} className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xs font-mono font-semibold text-slate-900 dark:text-white select-all">
                    {item.cmd}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyCmd(item.cmd)}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 transition"
                    title="Copy command"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium transition shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
