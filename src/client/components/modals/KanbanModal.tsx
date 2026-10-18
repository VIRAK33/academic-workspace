import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import {
  KanbanMilestone,
  KanbanStage,
  KanbanPriority,
  KanbanIssueType,
  SubtaskItem,
  IssueAttachment,
} from '../../../types';
import { ModalSheet } from '../common/ModalSheet';
import { Twemoji } from '../common/Twemoji';
import {
  X,
  Plus,
  Trash2,
  Check,
  CheckSquare,
  Square,
  AlertCircle,
  Bookmark,
  Bug,
  CheckCircle2,
  Zap,
  Layers,
  ChevronDown,
  ChevronUp,
  Tag,
  Paperclip,
  UploadCloud,
  FileCode,
  FileText,
  FolderArchive,
  Eye,
  Sliders,
  Send,
  Sparkles,
  User,
  ListTodo,
  Code,
  Link,
  List,
} from 'lucide-react';

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
  const { viewedSemester, saveKanban, sprints, kanban } = ws;

  // Active & Planned Sprints
  const activeSprint = sprints.find((s) => s.status === 'active');
  const plannedSprint = sprints.find((s) => s.status === 'planned');

  // Form State
  const [title, setTitle] = useState('');
  const [sprintId, setSprintId] = useState<string>('');
  const [stage, setStage] = useState<KanbanStage>('todo');
  const [targetWeek, setTargetWeek] = useState('W6');
  const [project, setProject] = useState('Graph-RAG Paper');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<KanbanPriority>('medium');
  const [issueType, setIssueType] = useState<KanbanIssueType>('experiment');
  const [storyPoints, setStoryPoints] = useState<number>(3);
  const [tags, setTags] = useState<string[]>(['#backend', '#reliability']);
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Subtasks & Attachments
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [attachments, setAttachments] = useState<IssueAttachment[]>([]);

  // Markdown Editor Tabs
  const [descTab, setDescTab] = useState<'write' | 'preview'>('write');

  // Collapsible Advanced Section
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(true);

  // Quick "Create Another" continuous toggle
  const [createAnother, setCreateAnother] = useState(false);
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setTags(initialMilestone.tags || ['#research', '#core']);
      setSubtasks(initialMilestone.subtasks || []);
      setAttachments(initialMilestone.attachments || []);
    } else {
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
      setTags(['#research', '#pipeline']);
      setSubtasks([]);
      setAttachments([]);
    }
    setNewSubtaskTitle('');
    setNewTagInput('');
    setIsAddingTag(false);
  }, [initialMilestone, isOpen, defaultSprintId, defaultStage, activeSprint?.id]);

  if (!isOpen) return null;

  // Insert Markdown helper
  const handleInsertMarkdown = (prefix: string, suffix: string = '') => {
    setNotes((prev) => `${prev}${prefix}${suffix}`);
  };

  const handleInsertChecklistTemplate = () => {
    const template = `\n### Acceptance Criteria\n- [ ] Core pipeline implementation completed\n- [ ] Benchmarks evaluated and metrics logged\n- [ ] Artifact or figures generated`;
    setNotes((prev) => `${prev}${template}`);
  };

  // Tag Handlers
  const handleAddTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTagInput.trim()) return;
    const formatted = newTagInput.startsWith('#') ? newTagInput.trim() : `#${newTagInput.trim()}`;
    if (!tags.includes(formatted)) {
      setTags([...tags, formatted]);
    }
    setNewTagInput('');
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Subtask Handlers
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

  // File Upload Handling
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const category: 'image' | 'data' | 'design' | 'doc' =
      file.type.startsWith('image/')
        ? 'image'
        : file.name.endsWith('.json') || file.name.endsWith('.har') || file.name.endsWith('.csv')
        ? 'data'
        : file.name.endsWith('.zip')
        ? 'design'
        : 'doc';

    const newAtt: IssueAttachment = {
      id: 'att_' + Date.now().toString(36),
      name: file.name,
      sizeBytes: file.size,
      category,
      mimeType: file.type || undefined,
      uploadedAt: 'Just now',
      tag: '#attachment',
      verified: true,
    };

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        newAtt.dataUrl = e.target?.result as string;
        setAttachments((prev) => [newAtt, ...prev]);
      };
      reader.readAsDataURL(file);
    } else {
      setAttachments((prev) => [newAtt, ...prev]);
    }
  };

  const completedSubtasksCount = subtasks.filter((s) => s.completed).length;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;

    // Generate Issue Key e.g. SPR-108
    const nextKeyNum = 100 + kanban.length + 1;
    const issueKey = initialMilestone?.issueKey || `SPR-${nextKeyNum}`;

    const milestone: KanbanMilestone = {
      id: initialMilestone ? initialMilestone.id : 'k_' + Date.now().toString(36),
      issueKey,
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
      tags,
      subtasks,
      attachments,
      sortOrder: initialMilestone?.sortOrder || 0,
      createdAt: initialMilestone?.createdAt || new Date().toISOString(),
    };

    saveKanban(milestone);

    if (createAnother) {
      setTitle('');
      setNotes('');
      setSubtasks([]);
      setAttachments([]);
      setStoryPoints(3);
    } else {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} maxWidthClass="sm:max-w-xl">
      {({ requestClose, dragHandleProps }) => (
        <form
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs text-slate-800 dark:text-slate-200"
        >
          {/* Top Form Context Bar */}
          <div
            {...dragHandleProps}
            className="px-4 py-3 sm:px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 cursor-grab active:cursor-grabbing select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={requestClose}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
                title="Discard issue"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                    {initialMilestone ? 'Edit Issue' : 'Create Issue'}
                  </h3>
                  <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    SPR
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 truncate">
                  {viewedSemester?.name || 'Academic Workspace'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 px-2 py-0.5 rounded-full text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Draft ready</span>
              </div>

              <button
                type="button"
                onClick={handleInsertChecklistTemplate}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Insert Acceptance Template"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </button>
            </div>
          </div>

          {/* Scrollable Form Body */}
          <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto custom-scrollbar flex-1 min-h-0 text-slate-700 dark:text-slate-300">
            
            {/* 1. Destination Selector Block */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <label className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                  Destination
                </label>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {sprintId ? 'Sprint Queue' : 'Triage Queue'}
                </span>
              </div>

              {/* Segmented Pill Options */}
              <div className="grid grid-cols-3 gap-1.5 bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-xl">
                {/* Backlog */}
                <button
                  type="button"
                  onClick={() => setSprintId('')}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-all text-xs ${
                    sprintId === ''
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="truncate">Backlog</span>
                  <span className="text-[10px] opacity-70 font-normal">Default</span>
                </button>

                {/* Planning Sprint */}
                <button
                  type="button"
                  disabled={!plannedSprint}
                  onClick={() => plannedSprint && setSprintId(plannedSprint.id)}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-all text-xs ${
                    sprintId === plannedSprint?.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-40'
                  }`}
                >
                  <span className="truncate">{plannedSprint ? plannedSprint.name : 'Sprint Planning'}</span>
                  <span className="text-[10px] opacity-70 font-normal">Planning</span>
                </button>

                {/* Active Sprint */}
                <button
                  type="button"
                  disabled={!activeSprint}
                  onClick={() => activeSprint && setSprintId(activeSprint.id)}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-all text-xs ${
                    sprintId === activeSprint?.id
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-40'
                  }`}
                >
                  <span className="truncate">{activeSprint ? activeSprint.name : 'Active Sprint'}</span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Active</span>
                </button>
              </div>
            </div>

            {/* 2. Issue Type Selector Strip */}
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <label className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Issue Type
              </label>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                {[
                  { id: 'experiment', label: 'Story (Exp)', emoji: '🧪' },
                  { id: 'code', label: 'Task (Dev)', emoji: '💻' },
                  { id: 'writing', label: 'Draft (Paper)', emoji: '📝' },
                  { id: 'reading', label: 'Spike (Reading)', emoji: '📖' },
                  { id: 'coursework', label: 'Coursework', emoji: '📚' },
                ].map((typeItem) => (
                  <button
                    key={typeItem.id}
                    type="button"
                    onClick={() => setIssueType(typeItem.id as KanbanIssueType)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs whitespace-nowrap transition-all ${
                      issueType === typeItem.id
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Twemoji emoji={typeItem.emoji} className="w-3.5 h-3.5 shrink-0" />
                    <span>{typeItem.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Core Summary & Description with Markdown Toolbar */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
              {/* Summary / Title */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1">
                    <span>Summary</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <span className="font-mono text-[10px] text-slate-400">
                    {title.length}/160
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={160}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Implement webhook retry mechanism with exponential backoff"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                    Description & Acceptance Criteria
                  </label>

                  {/* Write / Preview Tab Switcher */}
                  <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px]">
                    <button
                      type="button"
                      onClick={() => setDescTab('write')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                        descTab === 'write'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescTab('preview')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                        descTab === 'preview'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                </div>

                {descTab === 'write' ? (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800">
                    {/* Mini Markdown Toolbar */}
                    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <button
                        type="button"
                        onClick={() => handleInsertMarkdown('**bold**')}
                        className="w-6 h-6 rounded flex items-center justify-center font-bold hover:bg-white dark:hover:bg-slate-700 text-xs"
                        title="Bold"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertMarkdown('*italic*')}
                        className="w-6 h-6 rounded flex items-center justify-center italic font-serif hover:bg-white dark:hover:bg-slate-700 text-xs"
                        title="Italic"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertMarkdown('`code`')}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-white dark:hover:bg-slate-700"
                        title="Code snippet"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertMarkdown('[link](url)')}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-white dark:hover:bg-slate-700"
                        title="Hyperlink"
                      >
                        <Link className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertMarkdown('\n- ')}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-white dark:hover:bg-slate-700"
                        title="Bullet list"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleInsertChecklistTemplate}
                        className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-slate-700"
                        title="Insert Acceptance Template"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Template</span>
                      </button>
                    </div>

                    <textarea
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Provide acceptance criteria, technical approach, or benchmark setup..."
                      className="w-full p-2.5 bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none"
                    />
                  </div>
                ) : (
                  <div className="p-3 min-h-[96px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs whitespace-pre-wrap font-mono text-slate-700 dark:text-slate-200">
                    {notes.trim() ? notes : <span className="italic text-slate-400">No description provided</span>}
                  </div>
                )}
              </div>
            </div>

            {/* 4. Sprint & Estimation Metadata Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Fibonacci Story Points Estimator */}
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Story Points</span>
                  <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs flex items-center justify-center">
                    {storyPoints}p
                  </span>
                </div>

                {/* Fibonacci Quick Buttons */}
                <div className="flex items-center gap-1 overflow-x-auto pt-1 no-scrollbar">
                  {[1, 2, 3, 5, 8, 13].map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setStoryPoints(pt)}
                      className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 transition-all ${
                        storyPoints === pt
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs scale-105'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Picker */}
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between relative space-y-1.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Priority</span>
                
                <button
                  type="button"
                  onClick={() => setPriorityMenuOpen(!priorityMenuOpen)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  <div className="flex items-center gap-1.5 capitalize">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        priority === 'urgent'
                          ? 'bg-rose-500'
                          : priority === 'high'
                          ? 'bg-amber-500'
                          : priority === 'medium'
                          ? 'bg-blue-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    <span>{priority}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {priorityMenuOpen && (
                  <div className="absolute left-3 right-3 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-30 text-xs">
                    {(['urgent', 'high', 'medium', 'low'] as KanbanPriority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPriority(p);
                          setPriorityMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 capitalize text-xs"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            p === 'urgent' ? 'bg-rose-500' : p === 'high' ? 'bg-amber-500' : p === 'medium' ? 'bg-blue-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{p}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Assignee / Focus Card */}
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Assignee</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">Me</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700">
                  <div className="w-5 h-5 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center font-bold text-[9px] shrink-0">
                    ME
                  </div>
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                    Lead Researcher
                  </span>
                </div>
              </div>

              {/* Epic / Project Link */}
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-1.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Epic / Project</span>
                <input
                  type="text"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  placeholder="e.g. Graph-RAG Paper"
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-white font-medium"
                />
              </div>
            </div>

            {/* 5. Collapsible Advanced Properties (Classification & Scope) */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/60 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="w-full p-3.5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Classification, Subtasks & Scope</span>
                </div>
                {isAdvancedOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {isAdvancedOpen && (
                <div className="p-3.5 space-y-3.5 border-t border-slate-200 dark:border-slate-800">
                  {/* Labels / Tags */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Components & Labels
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-semibold"
                        >
                          <span>{t}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(t)}
                            className="hover:text-rose-500"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}

                      {isAddingTag ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            placeholder="tag name..."
                            className="w-20 px-1.5 py-0.5 text-[10px] rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddTag();
                              if (e.key === 'Escape') setIsAddingTag(false);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddTag()}
                            className="p-1 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                          >
                            <Check className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsAddingTag(true)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>Tag</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subtask Builder */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Subtasks / Checklist ({completedSubtasksCount}/{subtasks.length})
                      </span>
                    </div>

                    <div className="space-y-1">
                      {subtasks.map((st) => (
                        <div
                          key={st.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 gap-2"
                        >
                          <div
                            onClick={() => handleToggleSubtask(st.id)}
                            className="flex items-center gap-2 flex-1 cursor-pointer min-w-0"
                          >
                            {st.completed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span
                              className={`truncate text-xs ${
                                st.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {st.title}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteSubtask(st.id)}
                            className="text-slate-400 hover:text-rose-500 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {/* Add new subtask input */}
                      <div className="flex items-center gap-1.5 pt-0.5">
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
                          placeholder="Add subtask item..."
                          className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                        />
                        <button
                          type="button"
                          onClick={handleAddSubtask}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold text-xs"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Attachments Dropzone in Creation Form */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Attachments & Artifacts
                    </label>

                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={(e) => handleFilesSelected(e.target.files)}
                      className="hidden"
                    />

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/40 flex flex-col items-center justify-center gap-1 transition-colors"
                    >
                      <UploadCloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                        Drop trace logs, specs, or screenshots
                      </span>
                      <span className="text-[10px] text-slate-400">PNG, PDF, HAR or JSON up to 25MB</span>
                    </div>

                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {attachments.map((a) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-[10px] font-mono text-blue-700 dark:text-blue-300"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{a.name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Creation Tray */}
          <div className="px-4 py-3 sm:px-5 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={createAnother}
                  onChange={(e) => setCreateAnother(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 accent-blue-600"
                />
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  Create another issue
                </span>
              </label>
              <span className="font-mono text-[10px] text-slate-400">Ctrl + Enter</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={requestClose}
                className="w-1/3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors text-center"
              >
                Discard
              </button>
              <button
                type="submit"
                className="w-2/3 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-[0.99]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{sprintId ? 'Add to Sprint' : 'Add to Backlog'}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </ModalSheet>
  );
};
