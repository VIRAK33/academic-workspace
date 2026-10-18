import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { KanbanMilestone } from '../../../types';
import { ModalSheet } from '../common/ModalSheet';
import {
  X,
  ArrowLeft,
  AlertTriangle,
  History,
  Archive,
  Trash2,
  Lock,
  CheckCircle2,
  Layers,
  FileCode,
  Paperclip,
  MessageSquare,
  ShieldAlert,
  GitPullRequest,
  Check,
  TrendingDown,
} from 'lucide-react';

interface DeleteIssueModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
  milestone: KanbanMilestone | null;
  onDeleted?: () => void;
}

export const DeleteIssueModal: React.FC<DeleteIssueModalProps> = ({
  ws,
  isOpen,
  onClose,
  milestone,
  onDeleted,
}) => {
  const { deleteKanban, archiveKanban, sprints } = ws;

  const [strategy, setStrategy] = useState<'archive' | 'delete'>('archive');
  const [confirmInput, setConfirmInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStrategy('archive');
      setConfirmInput('');
      setIsProcessing(false);
    }
  }, [isOpen, milestone]);

  if (!isOpen || !milestone) return null;

  const issueKey = milestone.issueKey || `SPR-${milestone.id.slice(0, 4).toUpperCase()}`;
  const sprint = sprints.find((s) => s.id === milestone.sprintId);

  // Subtasks & Attachments stats
  const subtasksList = milestone.subtasks || [];
  const completedSubs = subtasksList.filter((s) => s.completed).length;
  const pendingSubs = subtasksList.length - completedSubs;

  const attachmentsList = milestone.attachments || [];
  const totalAttachmentBytes = attachmentsList.reduce((acc, a) => acc + (a.sizeBytes || 0), 0);
  const totalMB = (totalAttachmentBytes / (1024 * 1024)).toFixed(1);

  const commentsCount = (milestone.comments || []).length;
  const storyPoints = milestone.storyPoints ?? 3;

  // Validation phrase matching
  const targetKeyUpper = issueKey.toUpperCase();
  const inputUpper = confirmInput.trim().toUpperCase();
  const isPhraseMatched = inputUpper === targetKeyUpper || inputUpper === 'DELETE';

  const handleExecute = async () => {
    setIsProcessing(true);
    try {
      if (strategy === 'archive') {
        await archiveKanban(milestone.id, 'parked');
      } else {
        await deleteKanban(milestone.id);
      }
      if (onDeleted) onDeleted();
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} maxWidthClass="sm:max-w-lg">
      {({ requestClose, dragHandleProps }) => (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs text-slate-800 dark:text-slate-200">
          {/* Top App Context Bar */}
          <div
            {...dragHandleProps}
            className="px-4 py-3 sm:px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 cursor-grab active:cursor-grabbing select-none"
          >
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={requestClose}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors -ml-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Delete Issue Confirmation
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {issueKey}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={requestClose}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Body Content */}
          <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto custom-scrollbar flex-1 min-h-0 text-slate-700 dark:text-slate-300">
            
            {/* 1. Issue Metadata Context Card */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px] font-bold">
                    {milestone.project || '#CORE'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold border border-blue-200/60 dark:border-blue-900/60">
                    {issueKey}
                  </span>
                </div>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>{milestone.stage.replace('_', ' ')}</span>
                </span>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm leading-snug">
                  {milestone.title}
                </h4>
                {milestone.notes && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {milestone.notes}
                  </p>
                )}
              </div>

              {/* 4 Stat Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Priority</span>
                  <span className="text-xs font-bold capitalize text-slate-800 dark:text-slate-200 mt-0.5">
                    {milestone.priority || 'Medium'}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Estimate</span>
                  <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                    {storyPoints} Points
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Assignee</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                    Lead Researcher
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Cycle</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                    {sprint ? sprint.name : 'Backlog'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Irreversible Action Warning Box */}
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                    Irreversible Action Warning
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-mono text-[9px] font-bold border border-amber-200 dark:border-amber-800">
                    NON-REVERSIBLE
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-1 leading-relaxed">
                  Permanently deleting this deliverable alters active sprint velocity commitment, cascades across the progress burndown, and detaches linked artifact files.
                </p>
              </div>
            </div>

            {/* 3. Cascade Impact Analysis Section */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Cascade Impact Analysis
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono text-[10px] font-bold border border-rose-200 dark:border-rose-800">
                  5 Dependencies
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                {/* 1. Subtasks */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-slate-200/70 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {subtasksList.length} Linked Subtasks Purged
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono text-[9px] font-bold border border-rose-200 dark:border-rose-800">
                        Delete
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      {completedSubs} completed, {pendingSubs} in progress.
                    </span>
                  </div>
                </div>

                {/* 2. Velocity Deduction */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-slate-200/70 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                    <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Sprint Velocity Ledger Altered
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono text-[9px] font-bold border border-amber-200 dark:border-amber-800">
                        -{storyPoints} Pts
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      Deducts {storyPoints} story points from {sprint?.name || 'sprint'} velocity commitment.
                    </span>
                  </div>
                </div>

                {/* 3. Pull Request / Code */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-slate-200/70 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                    <GitPullRequest className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Branch & PR References Detached
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[9px] font-bold">
                        Unlink
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      Detaches connected pull request tickets and branch links.
                    </span>
                  </div>
                </div>

                {/* 4. Artifacts & Files */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-slate-200/70 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                    <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {attachmentsList.length} Attached Artifacts Detached
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[9px] font-bold">
                        {totalMB} MB
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      Stored benchmark datasets, figures, and trace JSON files.
                    </span>
                  </div>
                </div>

                {/* 5. Work Log Comments */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-slate-200/70 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Work Log & Audit Trail
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[9px] font-bold">
                        {commentsCount} notes
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      Technical iteration discussion and work notes.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Resolution Strategy Selection */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Select Resolution Strategy
              </span>

              <div className="space-y-2">
                {/* Strategy A: Move to Backlog / Archive (Recommended) */}
                <label
                  onClick={() => setStrategy('archive')}
                  className={`block rounded-2xl p-3 border-2 transition-all cursor-pointer ${
                    strategy === 'archive'
                      ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="delStrategy"
                      checked={strategy === 'archive'}
                      onChange={() => setStrategy('archive')}
                      className="mt-0.5 w-3.5 h-3.5 text-slate-900 dark:text-white focus:ring-slate-900"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Move to Backlog / Archive
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                          RECOMMENDED
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Safely parks the issue into Cold Storage. Keeps comments, subtasks, and PR references fully searchable for future research iterations.
                      </p>
                    </div>
                  </div>
                </label>

                {/* Strategy B: Permanently Delete */}
                <label
                  onClick={() => setStrategy('delete')}
                  className={`block rounded-2xl p-3 border-2 transition-all cursor-pointer ${
                    strategy === 'delete'
                      ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/30 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="delStrategy"
                      checked={strategy === 'delete'}
                      onChange={() => setStrategy('delete')}
                      className="mt-0.5 w-3.5 h-3.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                          Permanently Delete Issue
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono text-[10px] font-bold border border-rose-200 dark:border-rose-800">
                          DESTRUCTIVE
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Unconditionally wipes {issueKey} from database clusters, index caches, and sprint velocity charts.
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {/* Confirmation Verification Phrase Gate (When Permanent Delete is selected) */}
              {strategy === 'delete' && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-800 dark:text-slate-200">
                      Type <span className="font-mono text-rose-600 font-bold bg-rose-50 dark:bg-rose-950 px-1 py-0.2 rounded border border-rose-200 dark:border-rose-800">{issueKey}</span> or <span className="font-mono text-rose-600 font-bold bg-rose-50 dark:bg-rose-950 px-1 py-0.2 rounded border border-rose-200 dark:border-rose-800">DELETE</span>:
                    </label>
                    <span
                      className={`font-mono text-[10px] font-bold ${
                        isPhraseMatched ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {isPhraseMatched ? 'Phrase Verified ✓' : confirmInput ? 'Phrase mismatch' : 'Awaiting input'}
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      autoComplete="off"
                      spellCheck="false"
                      value={confirmInput}
                      onChange={(e) => setConfirmInput(e.target.value)}
                      placeholder={`${issueKey} or DELETE`}
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-rose-500"
                      autoFocus
                    />
                    {confirmInput && (
                      <button
                        type="button"
                        onClick={() => setConfirmInput('')}
                        className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Action Buttons */}
          <div className="px-4 py-3 sm:px-5 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 flex flex-col gap-2 shrink-0">
            <button
              type="button"
              disabled={isProcessing || (strategy === 'delete' && !isPhraseMatched)}
              onClick={handleExecute}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed ${
                strategy === 'delete'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900'
              }`}
            >
              {strategy === 'delete' ? (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isPhraseMatched ? `Permanently Delete ${issueKey}` : 'Type to unlock deletion'}</span>
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive Issue {issueKey}</span>
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={requestClose}
                className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors text-center"
              >
                Cancel & Keep Open
              </button>
              <button
                type="button"
                onClick={() => {
                  alert(`Audit Log for ${issueKey}:\n- Created: ${milestone.createdAt || 'N/A'}\n- Current Stage: ${milestone.stage}\n- Story Points: ${storyPoints}\n- Project: ${milestone.project}`);
                }}
                className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>Audit Details</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalSheet>
  );
};
