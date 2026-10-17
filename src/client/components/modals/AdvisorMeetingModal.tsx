import React, { useState } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { AdvisorMeeting } from '../../../types';
import { ModalSheet } from '../common/ModalSheet';

interface AdvisorMeetingModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
}

export const AdvisorMeetingModal: React.FC<AdvisorMeetingModalProps> = ({ ws, isOpen, onClose }) => {
  const { saveMeeting, selectedDate } = ws;

  const [meetingDate, setMeetingDate] = useState(selectedDate);
  const [agenda, setAgenda] = useState('1. Present HotpotQA ablation metrics\n2. Discuss ICML draft deadline\n3. Clarify thesis committee feedback');
  const [notes, setNotes] = useState('Advisor suggested prioritizing latency experiments for Section 4.');
  const [actionItemsStr, setActionItemsStr] = useState('Submit revised proposal outline by Friday, Rerun baseline with beam size 4');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingDate) return;

    const actionItems = actionItemsStr
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const newMeeting: AdvisorMeeting = {
      id: 'm_' + Date.now().toString(36),
      meetingDate,
      agendaMarkdown: agenda.trim() || undefined,
      discussionNotes: notes.trim() || undefined,
      actionItems,
    };

    saveMeeting(newMeeting);
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
                Log Advisor Meeting
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Record discussion points, supervisor guidance, and action items
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-3.5 overflow-y-auto custom-scrollbar flex-1 min-h-0 text-xs">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Meeting Date
              </label>
              <input
                type="date"
                required
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Agenda / Discussion Points
              </label>
              <textarea
                rows={3}
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Advisor Feedback & Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Action Items (comma-separated)
              </label>
              <input
                type="text"
                value={actionItemsStr}
                onChange={(e) => setActionItemsStr(e.target.value)}
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
              Save Meeting Log
            </button>
          </div>
        </form>
      )}
    </ModalSheet>
  );
};
