import React, { useState } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { X, Check, Sparkles, Pencil, Trash2, AlertTriangle, Plus, RotateCcw } from 'lucide-react';
import { Semester } from '../../../types';

interface SemesterModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
  onOpenAiImportModal?: () => void;
}

export const SemesterModal: React.FC<SemesterModalProps> = ({ ws, isOpen, onClose, onOpenAiImportModal }) => {
  const { semesters, viewedSemesterId, setViewedSemesterId, saveSemester, deleteSemester, showToast } = ws;

  // Form states
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('2026-09-14');
  const [totalWeeks, setTotalWeeks] = useState(19);
  const [setActive, setSetActive] = useState(true);

  // Deletion confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingSemester(null);
    setName('');
    setStartDate('2027-03-01');
    setTotalWeeks(19);
    setSetActive(true);
    setConfirmDeleteId(null);
  };

  const handleStartEdit = (s: Semester) => {
    setEditingSemester(s);
    setName(s.name);
    setStartDate(s.startDate);
    setTotalWeeks(s.totalWeeks);
    setSetActive(s.isActive);
    setConfirmDeleteId(null);
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingSemester) {
      // Update existing semester
      const updated: Semester = {
        ...editingSemester,
        name: name.trim(),
        startDate,
        totalWeeks,
        isActive: setActive,
        isArchived: !setActive,
      };
      saveSemester(updated);
      showToast(`Updated term: ${updated.name}`);
      resetForm();
    } else {
      // Create new semester
      const newSem: Semester = {
        id: 'sem_' + Date.now().toString(36),
        name: name.trim(),
        startDate,
        totalWeeks,
        isActive: setActive,
        isArchived: !setActive,
      };
      saveSemester(newSem);
      showToast(`Created term: ${newSem.name}`);
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    if (semesters.length <= 1) {
      showToast('Cannot delete the only academic term.');
      setConfirmDeleteId(null);
      return;
    }
    await deleteSemester(id);
    if (editingSemester?.id === id) {
      resetForm();
    }
    setConfirmDeleteId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-lg rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85dvh] sm:max-h-[88vh]">
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Manage Academic Terms
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
              Configure semesters, start dates, active status, and term archives.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-3.5 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* AI Import Shortcut */}
          {onOpenAiImportModal && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Import Timetable with AI
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Extract classes and dates from your syllabus or timetable photo.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAiImportModal();
                }}
                className="px-2.5 py-1.5 rounded-md bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium transition shrink-0 shadow-2xs"
              >
                Import with AI
              </button>
            </div>
          )}

          {/* Term List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400">
              <span>Existing Academic Terms ({semesters.length})</span>
              <span className="text-[10px] text-slate-400">Click Edit to modify or Delete to remove</span>
            </div>

            <div className="space-y-2">
              {semesters.map((s) => {
                const isViewing = s.id === viewedSemesterId;
                const isEditingThis = editingSemester?.id === s.id;
                const isConfirmingDelete = confirmDeleteId === s.id;

                return (
                  <div
                    key={s.id}
                    className={`p-3 rounded-lg border transition space-y-2 ${
                      isEditingThis
                        ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800/60 ring-1 ring-slate-900/20 dark:ring-white/20'
                        : isViewing
                        ? 'bg-slate-50/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">
                            {s.name}
                          </span>
                          {s.isActive ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold">
                              Active
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                              Archive
                            </span>
                          )}
                          {isViewing && (
                            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 font-medium">
                              (Viewing)
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          Week 1: {s.startDate} · {s.totalWeeks} Weeks Total
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Switch / View */}
                        {!isViewing && (
                          <button
                            type="button"
                            onClick={() => {
                              setViewedSemesterId(s.id);
                              onClose();
                            }}
                            className="px-2 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                            title="Open this semester in view"
                          >
                            Open
                          </button>
                        )}

                        {/* Set Active */}
                        {!s.isActive && (
                          <button
                            type="button"
                            onClick={() => saveSemester({ ...s, isActive: true, isArchived: false })}
                            className="px-2 py-1 rounded text-xs font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-2xs"
                            title="Set as currently active semester"
                          >
                            Set Active
                          </button>
                        )}

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(s)}
                          className={`p-1.5 rounded transition ${
                            isEditingThis
                              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title="Edit this semester"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          disabled={semesters.length <= 1}
                          onClick={() => setConfirmDeleteId(s.id)}
                          className={`p-1.5 rounded transition ${
                            semesters.length <= 1
                              ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                          }`}
                          title={semesters.length <= 1 ? 'Cannot delete the only academic term' : 'Delete this semester'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline Confirmation when Delete clicked */}
                    {isConfirmingDelete && (
                      <div className="mt-2 p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between gap-2 animate-in fade-in duration-100">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Delete <strong>{s.name}</strong> and its courses?</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDelete(s.id)}
                            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-medium"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Form: Create vs Edit */}
          <form
            onSubmit={handleSubmit}
            className={`p-4 rounded-lg border transition space-y-3.5 ${
              editingSemester
                ? 'bg-slate-100/70 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {editingSemester ? (
                  <>
                    <Pencil className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      Edit Term: {editingSemester.name}
                    </span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Create New Academic Term
                    </span>
                  </>
                )}
              </div>

              {editingSemester && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Cancel Edit</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Term Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 2026-2027 Spring"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Weeks
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  required
                  value={totalWeeks}
                  onChange={(e) => setTotalWeeks(parseInt(e.target.value, 10) || 19)}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                Week 1 Monday (Start Date)
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-0.5">
              <input
                type="checkbox"
                checked={setActive}
                onChange={(e) => setSetActive(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-0 accent-slate-900 dark:accent-white"
              />
              <span>Set as active term (archives previous active term)</span>
            </label>

            <div className="flex justify-end gap-2 pt-1">
              {editingSemester && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium transition shadow-xs"
              >
                {editingSemester ? 'Update Academic Term' : 'Create Term'}
              </button>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 sm:px-5 sm:py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-mono text-slate-400">
            Current Active Term: {semesters.find(s => s.isActive)?.name || 'None'}
          </span>
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
