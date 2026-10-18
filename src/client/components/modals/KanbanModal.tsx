import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import {
  KanbanMilestone,
  KanbanStage,
  KanbanPriority,
  KanbanIssueType,
  SubtaskItem,
} from '../../../types';
import { ModalSheet } from '../common/ModalSheet';
import { Plus, Trash2, CheckSquare, Square, AlertTriangle } from 'lucide-react';

interface KanbanModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
  initialMilestone?: KanbanMilestone | null;
  defaultSprintId?: string;
  defaultStage?: KanbanStage;
}

export const KanbanModal: React.FC<KanbanModalProps> = ({
  ws,
  isOpen,
  onClose,
  initialMilestone,
  defaultSprintId,
  defaultStage,
}) => {
  const { viewedSemester, saveKanban, sprints } = ws;

  const [title, setTitle] = useState('');
  const [sprintId, setSprintId] = useState<string>('');
  const [stage, setStage] = useState<KanbanStage>('todo');
  const [targetWeek, setTargetWeek] = useState('W6');
  const [project, setProject] = useState('Graph-RAG Paper');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<KanbanPriority>('medium');
  const [issueType, setIssueType] = useState<KanbanIssueType>('experiment');
  const [storyPoints, setStoryPoints] = useState<number>(3);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [blockedReason, setBlockedReason] = useState<string>('');
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<string>('');

  useEffect(() => {
    if (initialMilestone) {
      setTitle(initialMilestone.title);
      setSprintId(initialMilestone.sprintId || '');
      setStage(initialMilestone.stage);
      setTargetWeek(initialMilestone.targetWeek || 'W6');
      setProject(initialMilestone.project);
      setNotes(initialMilestone.notes || '');
      setPriority(initialMilestone.priority || 'medium');
      setIssueType(initialMilestone.issueType || 'experiment');
      setStoryPoints(initialMilestone.storyPoints != null ? initialMilestone.storyPoints : 3);
      setIsBlocked(Boolean(initialMilestone.isBlocked));
      setBlockedReason(initialMilestone.blockedReason || '');
      setSubtasks(initialMilestone.subtasks || []);
    } else {
      const activeSprint = sprints.find((s) => s.status === 'active');
      const initialSprint = defaultSprintId !== undefined ? defaultSprintId : activeSprint?.id || '';

      setTitle('');
      setSprintId(initialSprint);
      setStage(defaultStage || 'todo');
      setTargetWeek('W6');
      setProject(project || 'Graph-RAG Paper');
      setNotes('');
      setPriority('medium');
      setIssueType('experiment');
      setStoryPoints(3);
      setIsBlocked(false);
      setBlockedReason('');
      setSubtasks([]);
    }
    setNewSubtaskTitle('');
  }, [initialMilestone, isOpen, defaultSprintId, defaultStage, sprints]);

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const item: SubtaskItem = {
      id: 'st_' + Date.now().toString(36),
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    setSubtasks([...subtasks, item]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks(subtasks.map((st) => (st.id === id ? { ...st, completed: !st.completed } : st)));
  };

  const handleDeleteSubtask = (id: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const milestone: KanbanMilestone = {
      id: initialMilestone ? initialMilestone.id : 'k_' + Date.now().toString(36),
      semesterId: viewedSemester?.id,
      sprintId: sprintId.trim() || undefined,
      title: title.trim(),
      stage,
      targetWeek: targetWeek.trim() || 'W1',
      project: project.trim() || 'General',
      notes: notes.trim() || undefined,
      priority,
      issueType,
      storyPoints: Number(storyPoints) || 1,
      isBlocked,
      blockedReason: isBlocked ? blockedReason.trim() : undefined,
      subtasks,
      sortOrder: initialMilestone?.sortOrder || 0,
    };

    saveKanban(milestone);
    onClose();
  };

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} maxWidthClass="sm:max-w-md">
      {({ requestClose, dragHandleProps }) => (
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
          {/* Draggable Header */}
          <div
            {...dragHandleProps}
            className="px-4 py-2.5 sm:px-5 sm:py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 cursor-grab active:cursor-grabbing select-none"
          >
            <div>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                {initialMilestone ? 'Edit Deliverable' : 'New Deliverable'}
              </h3>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-2.5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
            {/* Title */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Run comparative baseline evaluation"
                className="w-full px-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>

            {/* Sprint & Stage Row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                  Sprint
                </label>
                <select
                  value={sprintId}
                  onChange={(e) => setSprintId(e.target.value)}
                  className="w-full px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">📋 Backlog (No Sprint)</option>
                  {sprints.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.status === 'active' ? '🏃 Active: ' : '⏳ '} {sp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                  Stage
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as any)}
                  className="w-full px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  <optgroup label="Agile Stages">
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="done">Done</option>
                  </optgroup>
                  <optgroup label="Academic Stages">
                    <option value="lit_review">Literature Review</option>
                    <option value="experiments">Experiments</option>
                    <option value="drafting">Drafting</option>
                    <option value="under_review">Under Review</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Type, Priority & Story Points */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                  Type
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value as any)}
                  className="w-full px-1.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="experiment">🧪 Exp</option>
                  <option value="writing">📝 Draft</option>
                  <option value="reading">📖 Paper</option>
                  <option value="code">💻 Dev</option>
                  <option value="coursework">📚 Class</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-1.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="urgent">🔴 Urgent</option>
                  <option value="high">🟠 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">⚪ Low</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                  Points
                </label>
                <select
                  value={storyPoints}
                  onChange={(e) => setStoryPoints(Number(e.target.value))}
                  className="w-full px-1.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none font-mono"
                >
                  <option value={1}>1 pt</option>
                  <option value={2}>2 pts</option>
                  <option value={3}>3 pts</option>
                  <option value={5}>5 pts</option>
                  <option value={8}>8 pts</option>
                </select>
              </div>
            </div>

            {/* Project Tag & Target Week */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                  Project
                </label>
                <input
                  type="text"
                  required
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  placeholder="e.g. Graph-RAG Paper"
                  className="w-full px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                  Week / Target
                </label>
                <input
                  type="text"
                  value={targetWeek}
                  onChange={(e) => setTargetWeek(e.target.value)}
                  placeholder="e.g. W6"
                  className="w-full px-2 py-1 text-xs font-mono rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Subtask Checklist */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                Checklist ({subtasks.filter((s) => s.completed).length}/{subtasks.length})
              </label>

              {subtasks.length > 0 && (
                <div className="space-y-1 max-h-28 overflow-y-auto pr-0.5">
                  {subtasks.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between gap-1.5 p-1 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 text-[11px]"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleSubtask(st.id)}
                        className="flex items-center gap-1.5 text-left flex-1 min-w-0"
                      >
                        {st.completed ? (
                          <CheckSquare className="w-3 h-3 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                        <span
                          className={`truncate ${
                            st.completed
                              ? 'line-through text-slate-400'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {st.title}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubtask(st.id)}
                        className="text-slate-400 hover:text-rose-500 p-0.5"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  placeholder="Add item..."
                  className="flex-1 px-2 py-0.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Blocked Flag */}
            <div className="p-2 rounded-md border border-slate-200/60 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 space-y-1">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isBlocked}
                  onChange={(e) => setIsBlocked(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Mark as Blocked</span>
                </span>
              </label>

              {isBlocked && (
                <input
                  type="text"
                  required={isBlocked}
                  value={blockedReason}
                  onChange={(e) => setBlockedReason(e.target.value)}
                  placeholder="Reason for block..."
                  className="w-full px-2 py-0.5 text-xs rounded-md border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Key details or citations..."
                className="w-full px-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 flex items-center justify-end gap-1.5 shrink-0">
            <button
              type="button"
              onClick={requestClose}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 rounded text-xs font-medium bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 transition shadow-2xs cursor-pointer"
            >
              {initialMilestone ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      )}
    </ModalSheet>
  );
};
