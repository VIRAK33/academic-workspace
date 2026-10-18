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
import { Plus, Trash2, CheckSquare, Square, AlertTriangle, Layers } from 'lucide-react';

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
      // Find active sprint by default if none specified
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
    <ModalSheet isOpen={isOpen} onClose={onClose} maxWidthClass="sm:max-w-lg">
      {({ requestClose, dragHandleProps }) => (
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Draggable Header */}
          <div
            {...dragHandleProps}
            className="px-5 py-3 sm:px-6 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {initialMilestone ? 'Edit Deliverable / Issue' : 'New Sprint Deliverable'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Track research tasks, experiments, papers, and milestones
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0 text-xs">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Deliverable Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Run comparative HotpotQA baseline benchmark"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>

            {/* Sprint & Stage Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Sprint / Location
                </label>
                <select
                  value={sprintId}
                  onChange={(e) => setSprintId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">📋 Backlog (No Sprint)</option>
                  {sprints.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.status === 'active' ? '🏃 [ACTIVE] ' : '⏳ '} {sp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Board Stage
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  <optgroup label="Agile Stages">
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Under Review / Testing</option>
                    <option value="done">Done / Completed</option>
                  </optgroup>
                  <optgroup label="Research Pipeline Stages">
                    <option value="lit_review">Literature Review</option>
                    <option value="experiments">Experiments</option>
                    <option value="drafting">Drafting</option>
                    <option value="under_review">Under Review</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Issue Type, Priority & Story Points */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Issue Type
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="experiment">🧪 Experiment</option>
                  <option value="writing">📝 Writing</option>
                  <option value="reading">📖 Lit Review</option>
                  <option value="code">💻 Code / Dev</option>
                  <option value="coursework">📚 Coursework</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="urgent">🔴 Urgent</option>
                  <option value="high">🟠 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">⚪ Low</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Story Points
                </label>
                <select
                  value={storyPoints}
                  onChange={(e) => setStoryPoints(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none font-mono"
                >
                  <option value={1}>1 pt (Very quick)</option>
                  <option value={2}>2 pts (Minor task)</option>
                  <option value={3}>3 pts (Standard task)</option>
                  <option value={5}>5 pts (Complex task)</option>
                  <option value={8}>8 pts (Major deliverable)</option>
                </select>
              </div>
            </div>

            {/* Project Tag & Target Week */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Project / Epic
                </label>
                <input
                  type="text"
                  required
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  placeholder="e.g. Graph-RAG Paper, Thesis Chapter 2"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Week / Due
                </label>
                <input
                  type="text"
                  value={targetWeek}
                  onChange={(e) => setTargetWeek(e.target.value)}
                  placeholder="e.g. W6, Oct 24"
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Subtask Checklist */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Subtasks / Checklist ({subtasks.filter((s) => s.completed).length}/{subtasks.length})
              </label>

              {subtasks.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {subtasks.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between gap-2 p-1.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleSubtask(st.id)}
                        className="flex items-center gap-2 text-left flex-1 min-w-0"
                      >
                        {st.completed ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span
                          className={`truncate text-xs ${
                            st.completed
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {st.title}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubtask(st.id)}
                        className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1.5">
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
                  placeholder="Add actionable subtask item..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Blocked Flag */}
            <div className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isBlocked}
                  onChange={(e) => setIsBlocked(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Mark as Blocked</span>
                </span>
              </label>

              {isBlocked && (
                <input
                  type="text"
                  required={isBlocked}
                  value={blockedReason}
                  onChange={(e) => setBlockedReason(e.target.value)}
                  placeholder="Reason for block (e.g. Waiting on GPU cluster quota, waiting on advisor reply)"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                />
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Notes & Deliverable Scope
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Key details, citations, benchmark configs..."
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
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
              {initialMilestone ? 'Save Changes' : 'Create Deliverable'}
            </button>
          </div>
        </form>
      )}
    </ModalSheet>
  );
};
