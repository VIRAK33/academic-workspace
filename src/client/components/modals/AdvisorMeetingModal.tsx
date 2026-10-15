import React, { useState } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { X } from 'lucide-react';
import { AdvisorMeeting } from '../../../types';

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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-xl sm:rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Log Advisor Meeting</h3>
          <button type="button" onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Meeting Date</label>
            <input
              type="date"
              required
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Agenda / Discussion Points</label>
            <textarea
              rows={3}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Advisor Feedback & Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Action Items (comma-separated)</label>
            <input
              type="text"
              value={actionItemsStr}
              onChange={(e) => setActionItemsStr(e.target.value)}
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
              className="px-3 py-1.5 rounded text-xs font-medium bg-slate-900 dark:bg-white hover:bg-slate-800 text-white dark:text-slate-900"
            >
              Save Meeting Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
