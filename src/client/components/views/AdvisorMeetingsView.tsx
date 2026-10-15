import React from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { Plus, FileText, Calendar, CheckCircle, Copy } from 'lucide-react';

interface AdvisorMeetingsViewProps {
  ws: ReturnType<typeof useWorkspace>;
  onOpenMeetingModal: () => void;
  onOpenDigestModal: () => void;
}

export const AdvisorMeetingsView: React.FC<AdvisorMeetingsViewProps> = ({
  ws,
  onOpenMeetingModal,
  onOpenDigestModal,
}) => {
  const { advisorMeetings } = ws;

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Advisor 1-on-1 & Weekly Digest</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Log supervisor meeting notes, track agreed action items, and compile weekly progress</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenDigestModal}
            className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>1-Click Weekly Report</span>
          </button>
          <button
            type="button"
            onClick={onOpenMeetingModal}
            className="px-3 py-1.5 rounded-md bg-slate-900 dark:bg-white hover:bg-slate-800 text-white dark:text-slate-900 text-xs font-medium transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Meeting Log</span>
          </button>
        </div>
      </div>

      {/* Meeting Logs */}
      <div className="space-y-4">
        {advisorMeetings.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            No meeting logs recorded yet. Click "New Meeting Log" or generate a "1-Click Weekly Report"!
          </div>
        ) : (
          advisorMeetings.map((m) => (
            <div
              key={m.id}
              className="p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white font-mono">
                    Meeting Date: {m.meetingDate}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">ID: {m.id}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {m.agendaMarkdown && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Agenda & Discussion Points
                    </h4>
                    <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                      {m.agendaMarkdown}
                    </div>
                  </div>
                )}

                {m.discussionNotes && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Advisor Feedback & Guidance
                    </h4>
                    <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                      {m.discussionNotes}
                    </div>
                  </div>
                )}
              </div>

              {m.actionItems.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Agreed Action Items
                  </h4>
                  <ul className="space-y-1">
                    {m.actionItems.map((act, aIdx) => (
                      <li key={aIdx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
