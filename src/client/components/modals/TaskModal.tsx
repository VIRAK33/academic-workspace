import React, { useState, useEffect } from 'react';
import { useWorkspace, addDays, getTodayIsoDate } from '../../hooks/useWorkspace';
import { X, Plus } from 'lucide-react';
import { Task } from '../../../types';
import { ModalSheet } from '../common/ModalSheet';

interface TaskModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_TAGS = ['#Research', '#Class', '#Paper', '#Thesis'];

export const TaskModal: React.FC<TaskModalProps> = ({ ws, isOpen, onClose }) => {
  const { viewedSemester, selectedDate, saveTask, tasks } = ws;
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(selectedDate);
  const [selectedTags, setSelectedTags] = useState<string[]>(['#Research']);
  const [customTagInput, setCustomTagInput] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>(PRESET_TAGS);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync available tags with preset tags plus any custom tags found across tasks
  useEffect(() => {
    if (isOpen) {
      setDueDate(selectedDate);
      const tagSet = new Set<string>(PRESET_TAGS);
      tasks.forEach(t => (t.tags || []).forEach(tag => {
        if (tag && tag.trim()) {
          tagSet.add(tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim()}`);
        }
      }));
      setAvailableTags(Array.from(tagSet));
      setCustomTagInput('');
    }
  }, [isOpen, selectedDate, tasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const newTask: Task = {
        id: 't_' + Date.now().toString(36),
        semesterId: viewedSemester.id,
        title: title.trim(),
        category: selectedTags.includes('#Class') ? 'Coursework' : 'Research',
        tags: selectedTags,
        dueDate,
        status: 'in_progress',
        priority: 'high',
      };

      await saveTask(newTask);
      setTitle('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      if (selectedTags.length > 1) setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    let raw = customTagInput.trim();
    if (!raw) return;
    if (!raw.startsWith('#')) raw = `#${raw}`;
    const cleanTag = raw.replace(/\s+/g, '-');
    if (!availableTags.includes(cleanTag)) {
      setAvailableTags(prev => [...prev, cleanTag]);
    }
    if (!selectedTags.includes(cleanTag)) {
      setSelectedTags(prev => [...prev, cleanTag]);
    }
    setCustomTagInput('');
  };

  const handleRemoveCustomTag = (tagToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAvailableTags(prev => prev.filter(t => t !== tagToRemove));
    setSelectedTags(prev => prev.filter(t => t !== tagToRemove));
  };

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} maxWidthClass="sm:max-w-md">
      {({ requestClose, dragHandleProps }) => (
        <>
          <div
            {...dragHandleProps}
            className="px-4 py-2.5 sm:px-5 sm:py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">New Task</h3>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1 min-h-0">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Draft ablation study for Graph-RAG paper..."
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Due Date</label>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDueDate(getTodayIsoDate())}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center justify-center ${
                    dueDate === getTodayIsoDate()
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setDueDate(addDays(getTodayIsoDate(), 1))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center justify-center ${
                    dueDate === addDays(getTodayIsoDate(), 1)
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Tomorrow
                </button>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full sm:w-auto sm:ml-auto text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 font-mono text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Tags</label>
                <span className="text-[11px] text-slate-400">Select or add custom tags</span>
              </div>
              
              {/* Tag Badges */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {availableTags.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  const isCustom = !PRESET_TAGS.includes(tag);
                  return (
                    <div
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer select-none transition ${
                        isSelected
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <span>{tag}</span>
                      {isCustom && (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveCustomTag(tag, e)}
                          className={`p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition ${
                            isSelected ? 'text-white/80 dark:text-slate-900/80' : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title="Remove tag"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Custom Tag Input */}
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">#</span>
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                    placeholder="New tag (e.g. Lab, Exam, Thesis)..."
                    className="w-full pl-6 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white font-mono transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomTag}
                  disabled={!customTagInput.trim()}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 transition flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="px-4 py-2.5 sm:px-5 sm:py-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs shrink-0 z-10">
            <button
              type="button"
              onClick={requestClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 disabled:opacity-50 transition shadow-xs cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </form>
      </>
    )}
  </ModalSheet>
);
};
