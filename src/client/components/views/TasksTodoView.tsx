import React, { useState, useMemo } from 'react';
import { useWorkspace, calculateAcademicWeek } from '../../hooks/useWorkspace';
import { Plus, Trash2, Archive, ArchiveRestore, Check, Clock } from 'lucide-react';
import { Task } from '../../../types';

interface TasksTodoViewProps {
  ws: ReturnType<typeof useWorkspace>;
  onOpenTaskModal: () => void;
}

type ViewStatusMode = 'active' | 'completed' | 'all' | 'archived';

export const TasksTodoView: React.FC<TasksTodoViewProps> = ({ ws, onOpenTaskModal }) => {
  const {
    tasks,
    viewedSemester,
    saveTask,
    deleteTask,
    archiveTask,
    unarchiveTask,
    archiveAllCompleted,
    searchQuery,
  } = ws;

  const [filterTag, setFilterTag] = useState<string>('ALL');
  const [statusMode, setStatusMode] = useState<ViewStatusMode>('active');

  const q = searchQuery.toLowerCase().trim();

  // Dynamic tag list combining presets and any custom tags across tasks
  const allFilterTags = useMemo(() => {
    const set = new Set<string>(['#Research', '#Class', '#Paper', '#Thesis']);
    tasks.forEach(t => (t.tags || []).forEach(tag => {
      if (tag && tag.trim()) {
        set.add(tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim()}`);
      }
    }));
    return Array.from(set);
  }, [tasks]);

  // Counts
  const semesterTasks = tasks.filter(t => !t.semesterId || t.semesterId === viewedSemester.id);
  const activeCount = semesterTasks.filter(t => t.status === 'in_progress').length;
  const completedCount = semesterTasks.filter(t => t.status === 'completed').length;
  const archivedCount = semesterTasks.filter(t => t.status === 'archived').length;

  const filteredTasks = semesterTasks.filter(task => {
    // Tag filter
    if (filterTag !== 'ALL' && !task.tags.includes(filterTag)) return false;

    // Search query
    if (q && !task.title.toLowerCase().includes(q) && !task.tags.some(t => t.toLowerCase().includes(q))) {
      return false;
    }

    // Status filter
    if (statusMode === 'active') return task.status === 'in_progress';
    if (statusMode === 'completed') return task.status === 'completed';
    if (statusMode === 'all') return task.status === 'in_progress' || task.status === 'completed';
    if (statusMode === 'archived') return task.status === 'archived';

    return true;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs space-y-0">
      
      {/* Top Segmented Status Navigation */}
      <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
        {/* Status Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setStatusMode('active')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
              statusMode === 'active'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Open</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusMode('completed')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
              statusMode === 'completed'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Done</span>
            {completedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold">
                {completedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStatusMode('all')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition ${
              statusMode === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Active
          </button>

          <button
            type="button"
            onClick={() => setStatusMode('archived')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
              statusMode === 'archived'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Archive className="w-3.5 h-3.5 text-slate-500" />
            <span>Archive</span>
            {archivedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {archivedCount}
              </span>
            )}
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {completedCount > 0 && statusMode !== 'archived' && (
            <button
              type="button"
              onClick={archiveAllCompleted}
              className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/80 transition flex items-center gap-1.5"
              title="Clean completed tasks from screen and store in archive"
            >
              <Archive className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Archive Done ({completedCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenTaskModal}
            className="px-2.5 py-1.5 rounded-md bg-slate-900 dark:bg-white hover:bg-slate-800 text-white dark:text-slate-900 text-xs font-medium transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Tag Filters Strip */}
      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
        <span className="text-slate-400 dark:text-slate-500 text-[11px] font-medium mr-1">Tags:</span>
        <button
          type="button"
          onClick={() => setFilterTag('ALL')}
          className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
            filterTag === 'ALL'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          #All
        </button>
        {allFilterTags.map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => setFilterTag(tag)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
              filterTag === tag
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Task Rows List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {filteredTasks.length === 0 ? (
          <div className="py-14 text-center text-xs text-slate-400 space-y-1">
            {statusMode === 'archived' ? (
              <>
                <Archive className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p>The Archive is currently empty.</p>
                <p className="text-[11px] text-slate-400">Completed tasks older than 7 days or swept manually will appear here.</p>
              </>
            ) : statusMode === 'completed' ? (
              <p>No recently completed tasks.</p>
            ) : (
              <>
                <p>No active tasks found.</p>
                <button
                  type="button"
                  onClick={onOpenTaskModal}
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 underline"
                >
                  + Add task
                </button>
              </>
            )}
          </div>
        ) : (
          filteredTasks.map(task => {
            const isDone = task.status === 'completed';
            const isArchived = task.status === 'archived';
            const week = calculateAcademicWeek(task.dueDate, viewedSemester.startDate);

            return (
              <div
                key={task.id}
                className={`p-3.5 transition flex items-start justify-between gap-3 ${
                  isArchived
                    ? 'bg-slate-50/40 dark:bg-slate-800/10 opacity-75'
                    : isDone
                    ? 'bg-slate-50/40 dark:bg-slate-800/20 opacity-75'
                    : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                }`}
              >
                <label className="flex items-start gap-3 cursor-pointer select-none flex-1">
                  {!isArchived ? (
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={(e) => {
                        saveTask({ ...task, status: e.target.checked ? 'completed' : 'in_progress' });
                      }}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-slate-900 focus:ring-0 cursor-pointer"
                    />
                  ) : (
                    <span className="mt-0.5 p-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500">
                      <Archive className="w-3 h-3" />
                    </span>
                  )}

                  <div className="space-y-1 flex-1">
                    <div className={`text-xs sm:text-sm font-medium ${
                      isDone || isArchived ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'
                    }`}>
                      {task.title}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {task.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700"
                        >
                          {tag}
                        </span>
                      ))}
                      <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                        Due: {task.dueDate} · W{week}
                      </span>
                      {isArchived && task.archivedAt && (
                        <span className="text-[10px] font-mono text-amber-700/80 dark:text-amber-400/80 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200/60 dark:border-amber-900">
                          Archived: {task.archivedAt.split('T')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </label>

                {/* Right Action Icons */}
                <div className="flex items-center gap-1 shrink-0">
                  {isArchived ? (
                    <button
                      type="button"
                      onClick={() => unarchiveTask(task.id)}
                      className="px-2 py-1 rounded text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1"
                      title="Restore to active tasks"
                    >
                      <ArchiveRestore className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Unarchive</span>
                    </button>
                  ) : isDone ? (
                    <button
                      type="button"
                      onClick={() => archiveTask(task.id)}
                      className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Move to Archive"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Delete Task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Archive Policy Tip Footer */}
      <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
        <span>Tip: Keep completed tasks on screen during the week for your advisor digest, then sweep to Archive.</span>
        <span className="font-mono">Total Tasks: {semesterTasks.length}</span>
      </div>

    </div>
  );
};
