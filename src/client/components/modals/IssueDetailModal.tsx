import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import {
  KanbanMilestone,
  KanbanStage,
  KanbanPriority,
  KanbanIssueType,
  IssueComment,
  ConnectedArtifact,
  SubtaskItem,
} from '../../../types';
import { ModalSheet } from '../common/ModalSheet';
import { Twemoji, renderWithTwemoji } from '../common/Twemoji';
import {
  X,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit2,
  Check,
  Plus,
  Send,
  ExternalLink,
  GitPullRequest,
  FileText,
  Paperclip,
  Trash2,
  Layers,
  ChevronDown,
  Sparkles,
  Calendar,
  Tag,
} from 'lucide-react';

interface IssueDetailModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
  milestone: KanbanMilestone | null;
  onOpenEditModal?: (milestone: KanbanMilestone) => void;
}

const ISSUE_TYPES: { id: KanbanIssueType; label: string; emoji: string }[] = [
  { id: 'experiment', label: 'Experiment', emoji: '🧪' },
  { id: 'writing', label: 'Paper Draft', emoji: '📝' },
  { id: 'reading', label: 'Paper Reading', emoji: '📖' },
  { id: 'code', label: 'Code & Dev', emoji: '💻' },
  { id: 'coursework', label: 'Coursework', emoji: '📚' },
];

export const IssueDetailModal: React.FC<IssueDetailModalProps> = ({
  ws,
  isOpen,
  onClose,
  milestone,
  onOpenEditModal,
}) => {
  const { saveKanban, sprints } = ws;

  // Local editable state
  const [currentMilestone, setCurrentMilestone] = useState<KanbanMilestone | null>(milestone);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');

  // Dropdown states
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showPointsMenu, setShowPointsMenu] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showWeekMenu, setShowWeekMenu] = useState(false);

  // Subtask creation
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Thread discussion
  const [replyText, setReplyText] = useState('');
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Artifact creation
  const [isAddingArtifact, setIsAddingArtifact] = useState(false);
  const [newArtifactTitle, setNewArtifactTitle] = useState('');
  const [newArtifactUrl, setNewArtifactUrl] = useState('');
  const [newArtifactType, setNewArtifactType] = useState<'figma' | 'pr' | 'paper' | 'link'>('pr');

  useEffect(() => {
    if (milestone) {
      setCurrentMilestone(milestone);
      setTitleDraft(milestone.title);
      setNotesDraft(milestone.notes || '');
    }
  }, [milestone]);

  if (!isOpen || !currentMilestone) return null;

  const currentSprint = sprints.find((s) => s.id === currentMilestone.sprintId);
  const issueKey = currentMilestone.issueKey || `SPR-${currentMilestone.id.slice(0, 4).toUpperCase()}`;

  // Helper to persist updates
  const updateAndSave = (partial: Partial<KanbanMilestone>) => {
    const updated: KanbanMilestone = {
      ...currentMilestone,
      ...partial,
    };
    setCurrentMilestone(updated);
    saveKanban(updated);
  };

  // Status cycling / selection
  const handleSelectStage = (newStage: KanbanStage) => {
    setShowStatusMenu(false);
    updateAndSave({ stage: newStage });
  };

  const handleSelectPriority = (p: KanbanPriority) => {
    setShowPriorityMenu(false);
    updateAndSave({ priority: p });
  };

  const handleSelectPoints = (pts: number) => {
    setShowPointsMenu(false);
    updateAndSave({ storyPoints: pts });
  };

  const handleSelectType = (t: KanbanIssueType) => {
    setShowTypeMenu(false);
    updateAndSave({ issueType: t });
  };

  const handleSelectWeek = (w: string) => {
    setShowWeekMenu(false);
    updateAndSave({ targetWeek: w });
  };

  // Subtask toggles
  const handleToggleSubtask = (subtaskId: string) => {
    const currentSubs = currentMilestone.subtasks || [];
    const updatedSubs = currentSubs.map((sub) =>
      sub.id === subtaskId ? { ...sub, completed: !sub.completed } : sub
    );
    updateAndSave({ subtasks: updatedSubs });
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const currentSubs = currentMilestone.subtasks || [];
    const newSub: SubtaskItem = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    updateAndSave({ subtasks: [...currentSubs, newSub] });
    setNewSubtaskTitle('');
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    const currentSubs = currentMilestone.subtasks || [];
    updateAndSave({ subtasks: currentSubs.filter((s) => s.id !== subtaskId) });
  };

  // Subtask stats
  const subtasksList = currentMilestone.subtasks || [];
  const completedSubtasks = subtasksList.filter((s) => s.completed).length;
  const subtasksProgress =
    subtasksList.length > 0 ? Math.round((completedSubtasks / subtasksList.length) * 100) : 0;

  // Artifact additions
  const handleAddArtifact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArtifactTitle.trim()) return;
    const currentArtifacts = currentMilestone.connectedArtifacts || [];
    const newArt: ConnectedArtifact = {
      title: newArtifactTitle.trim(),
      url: newArtifactUrl.trim() || undefined,
      type: newArtifactType,
      status: newArtifactType === 'pr' ? 'CI Checks Passing' : 'Ready',
    };
    updateAndSave({ connectedArtifacts: [...currentArtifacts, newArt] });
    setNewArtifactTitle('');
    setNewArtifactUrl('');
    setIsAddingArtifact(false);
  };

  // Work Log Comments
  const commentsList = currentMilestone.comments || [
    {
      id: 'c-init',
      author: 'Workspace Note',
      createdAt: 'Initial entry',
      text: `Deliverable scope tracked for ${issueKey}. Ready for sprint execution.`,
      reactions: { '🚀': 1 },
    },
  ];

  const handleAddComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim()) return;
    const newComment: IssueComment = {
      id: `comm-${Date.now()}`,
      author: 'Work Log',
      createdAt: 'Just now',
      text: replyText.trim(),
      reactions: {},
    };
    updateAndSave({ comments: [...commentsList, newComment] });
    setReplyText('');
    setTimeout(() => {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleReactionClick = (commentId: string, emoji: string) => {
    const updated = commentsList.map((comm) => {
      if (comm.id !== commentId) return comm;
      const reactions = { ...(comm.reactions || {}) };
      reactions[emoji] = (reactions[emoji] || 0) + 1;
      return { ...comm, reactions };
    });
    updateAndSave({ comments: updated });
  };

  // Status pill meta
  const getStageMeta = (stage: KanbanStage) => {
    switch (stage) {
      case 'in_progress':
      case 'experiments':
        return {
          label: 'IN PROGRESS',
          badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-700/50',
          dotClass: 'bg-amber-500 animate-pulse',
        };
      case 'review':
      case 'under_review':
        return {
          label: 'IN REVIEW',
          badgeClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200/80 dark:border-blue-700/50',
          dotClass: 'bg-blue-500',
        };
      case 'done':
        return {
          label: 'DONE',
          badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-700/50',
          dotClass: 'bg-emerald-500',
        };
      case 'todo':
      case 'lit_review':
      case 'drafting':
      default:
        return {
          label: 'TO DO',
          badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          dotClass: 'bg-slate-400',
        };
    }
  };

  const stageMeta = getStageMeta(currentMilestone.stage);
  const currentTypeMeta = ISSUE_TYPES.find((t) => t.id === currentMilestone.issueType) || ISSUE_TYPES[0];

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-xl">
      <div className="flex flex-col h-[85vh] sm:h-[80vh] max-h-[840px] bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl border border-slate-200/80 dark:border-slate-800">
        
        {/* Top Navigation & Status Bar */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-mono text-[11px] font-semibold border border-blue-200/60 dark:border-blue-800/60 uppercase tracking-wider truncate max-w-[140px]">
              #{currentMilestone.project}
            </span>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wide">
              {issueKey}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Selector Pill */}
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-2xs active:scale-95 transition-all text-[11px] font-bold uppercase tracking-wider ${stageMeta.badgeClass}`}
              >
                <span className={`w-2 h-2 rounded-full ${stageMeta.dotClass}`}></span>
                <span>{stageMeta.label}</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {showStatusMenu && (
                <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-50 text-xs">
                  <button
                    onClick={() => handleSelectStage('todo')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 text-slate-700 dark:text-slate-200 text-xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span>To Do</span>
                  </button>
                  <button
                    onClick={() => handleSelectStage('in_progress')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 text-amber-700 dark:text-amber-300 font-medium text-xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>In Progress</span>
                  </button>
                  <button
                    onClick={() => handleSelectStage('review')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 text-blue-700 dark:text-blue-300 font-medium text-xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>In Review</span>
                  </button>
                  <button
                    onClick={() => handleSelectStage('done')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-medium text-xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Done</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-xs text-slate-700 dark:text-slate-300">
          
          {/* Issue Main Title */}
          <div className="flex flex-col gap-1">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (titleDraft.trim()) updateAndSave({ title: titleDraft.trim() });
                    setIsEditingTitle(false);
                  }}
                  className="p-1.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg text-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="group flex items-start justify-between gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                  {currentMilestone.title}
                </h1>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-opacity"
                  title="Edit title"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <Layers className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                {currentSprint ? currentSprint.name : 'Product Backlog'}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
              <span>Updated recently</span>
            </div>
          </div>

          {/* 2x2 Metadata Surface Grid (Single-User Personal Academic Workspace) */}
          <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            
            {/* Priority */}
            <div className="relative">
              <div
                onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                    currentMilestone.priority === 'urgent'
                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600'
                      : currentMilestone.priority === 'high'
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {currentMilestone.priority === 'urgent' ? (
                    <Twemoji emoji="🚨" className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                    PRIORITY
                  </span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate capitalize">
                    {currentMilestone.priority || 'Medium'}
                  </span>
                </div>
              </div>

              {showPriorityMenu && (
                <div className="absolute left-0 top-full mt-1 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-30 text-xs">
                  {(['urgent', 'high', 'medium', 'low'] as KanbanPriority[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => handleSelectPriority(p)}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 capitalize text-slate-700 dark:text-slate-200 text-xs"
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          p === 'urgent'
                            ? 'bg-rose-500'
                            : p === 'high'
                            ? 'bg-amber-500'
                            : p === 'medium'
                            ? 'bg-blue-500'
                            : 'bg-slate-400'
                        }`}
                      ></span>
                      <span>{p}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Story Points */}
            <div className="relative">
              <div
                onClick={() => setShowPointsMenu(!showPointsMenu)}
                className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shrink-0 font-mono font-bold text-[11px]">
                  {currentMilestone.storyPoints ?? 3}p
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                    ESTIMATE
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {currentMilestone.storyPoints ?? 3} Points
                  </span>
                </div>
              </div>

              {showPointsMenu && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-30 text-xs">
                  {[1, 2, 3, 5, 8, 13].map((pts) => (
                    <button
                      key={pts}
                      onClick={() => handleSelectPoints(pts)}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex justify-between text-xs"
                    >
                      <span>{pts} SP</span>
                      {currentMilestone.storyPoints === pts && <Check className="w-3 h-3 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Deliverable Type (with Twemoji) */}
            <div className="relative">
              <div
                onClick={() => setShowTypeMenu(!showTypeMenu)}
                className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center bg-purple-50 dark:bg-purple-950/60 text-purple-600 shrink-0">
                  <Twemoji emoji={currentTypeMeta.emoji} className="w-3.5 h-3.5 inline-block" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                    DELIVERABLE TYPE
                  </span>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                    {currentTypeMeta.label}
                  </span>
                </div>
              </div>

              {showTypeMenu && (
                <div className="absolute left-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-30 text-xs">
                  {ISSUE_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSelectType(t.id)}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200 text-xs"
                    >
                      <Twemoji emoji={t.emoji} className="w-3.5 h-3.5 inline-block" />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Target Academic Week */}
            <div className="relative">
              <div
                onClick={() => setShowWeekMenu(!showWeekMenu)}
                className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                    TARGET WEEK
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {currentMilestone.targetWeek || 'Backlog'}
                  </span>
                </div>
              </div>

              {showWeekMenu && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-30 text-xs max-h-48 overflow-y-auto">
                  {['Backlog', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W12', 'W14', 'W16'].map(
                    (w) => (
                      <button
                        key={w}
                        onClick={() => handleSelectWeek(w)}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between text-slate-700 dark:text-slate-200 font-mono text-xs"
                      >
                        <span>{w}</span>
                        {currentMilestone.targetWeek === w && <Check className="w-3 h-3 text-blue-600" />}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Description Section */}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white tracking-wide flex items-center gap-1.5 uppercase">
                <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Description & Notes
              </span>
              <button
                onClick={() => setIsEditingNotes(!isEditingNotes)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 active:scale-90 transition-transform p-1"
                title="Edit description"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {isEditingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  rows={3}
                  className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400 font-sans"
                  placeholder="Add technical specs, methodology notes, or acceptance criteria..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditingNotes(false)}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      updateAndSave({ notes: notesDraft.trim() });
                      setIsEditingNotes(false);
                    }}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-medium"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1 text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                {currentMilestone.notes ? (
                  <div className="whitespace-pre-wrap">
                    {renderWithTwemoji(currentMilestone.notes, 'w-3.5 h-3.5 inline-block')}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No notes added yet. Click edit to write specs or criteria.</p>
                )}
              </div>
            )}
          </div>

          {/* Connected Artifacts / Resources & PRs */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                Connected Artifacts
              </span>
              <button
                onClick={() => setIsAddingArtifact(!isAddingArtifact)}
                className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold cursor-pointer"
              >
                + Link
              </button>
            </div>

            {isAddingArtifact && (
              <form
                onSubmit={handleAddArtifact}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
              >
                <div className="flex gap-2">
                  <select
                    value={newArtifactType}
                    onChange={(e) => setNewArtifactType(e.target.value as any)}
                    className="h-7 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
                  >
                    <option value="pr">GitHub PR</option>
                    <option value="figma">Figma Spec</option>
                    <option value="paper">Paper / ArXiv</option>
                    <option value="link">Other Link</option>
                  </select>
                  <input
                    type="text"
                    value={newArtifactTitle}
                    onChange={(e) => setNewArtifactTitle(e.target.value)}
                    placeholder="Title (e.g. #482 feat: baseline eval)"
                    className="flex-1 h-7 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newArtifactUrl}
                    onChange={(e) => setNewArtifactUrl(e.target.value)}
                    placeholder="URL (optional, https://...)"
                    className="flex-1 h-7 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                  <button
                    type="submit"
                    className="px-3 h-7 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-medium text-xs"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 gap-1.5">
              {(currentMilestone.connectedArtifacts && currentMilestone.connectedArtifacts.length > 0) ? (
                currentMilestone.connectedArtifacts.map((art, idx) => (
                  <a
                    key={idx}
                    href={art.url || '#'}
                    target={art.url ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          art.type === 'figma'
                            ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 border border-purple-100 dark:border-purple-800'
                            : art.type === 'pr'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-100 dark:border-emerald-800'
                            : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 border border-blue-100 dark:border-blue-800'
                        }`}
                      >
                        {art.type === 'pr' ? (
                          <GitPullRequest className="w-3.5 h-3.5" />
                        ) : art.type === 'figma' ? (
                          <Sparkles className="w-3.5 h-3.5" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {art.title}
                        </span>
                        {art.status && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
                            {art.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                  </a>
                ))
              ) : (
                <div className="p-2 rounded-xl bg-white dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-400 text-xs">
                  <span>No PRs or specs connected</span>
                  <button
                    onClick={() => setIsAddingArtifact(true)}
                    className="text-blue-600 dark:text-blue-400 font-medium hover:underline text-xs"
                  >
                    + Add link
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Subtasks Checklist with Progress */}
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Subtasks
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-600">
                  {completedSubtasks} of {subtasksList.length} completed
                </span>
              </div>
              <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                {subtasksProgress}%
              </span>
            </div>

            {/* Progress Track */}
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${subtasksProgress}%` }}
              ></div>
            </div>

            {/* Checklist Items */}
            <div className="flex flex-col gap-1 pt-1">
              {subtasksList.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between gap-2 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleSubtask(item.id)}
                      className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span
                      className={`text-xs truncate ${
                        item.completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-700 dark:text-slate-200 font-medium'
                      }`}
                    >
                      {item.title}
                    </span>
                  </label>
                  <button
                    onClick={() => handleDeleteSubtask(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity"
                    title="Remove subtask"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Add subtask input */}
              <form onSubmit={handleAddSubtask} className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="+ Add new subtask..."
                  className="flex-1 h-7 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                {newSubtaskTitle.trim() && (
                  <button
                    type="submit"
                    className="px-2.5 h-7 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg text-[10px] font-bold"
                  >
                    Add
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* Work Log & Notes Stream */}
          <div className="flex flex-col gap-2 pt-1 pb-16">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Work Log & Updates ({commentsList.length})
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {commentsList.map((comm) => (
                <div
                  key={comm.id}
                  className="flex gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-2xs"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-slate-200 shrink-0">
                    W
                  </div>
                  <div className="flex flex-col flex-1 min-w-0 gap-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {comm.author}
                      </span>
                      <span className="font-mono text-[9px] text-slate-400">
                        {comm.createdAt}
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {renderWithTwemoji(comm.text, 'w-3.5 h-3.5 inline-block')}
                    </div>

                    {/* Reactions with Twemoji */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {Object.entries(comm.reactions || {}).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          onClick={() => handleReactionClick(comm.id, emoji)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs border border-slate-200 dark:border-slate-600 active:scale-95 transition-all"
                        >
                          <Twemoji emoji={emoji} className="w-3.5 h-3.5 inline-block" />
                          <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            {count}
                          </span>
                        </button>
                      ))}

                      {/* Quick Twemoji reaction choices */}
                      {['🚀', '👍', '👀', '❤️', '🎯', '🔥'].map((quickEmoji) => {
                        if (comm.reactions && comm.reactions[quickEmoji]) return null;
                        return (
                          <button
                            key={quickEmoji}
                            onClick={() => handleReactionClick(comm.id, quickEmoji)}
                            className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            title={`React ${quickEmoji}`}
                          >
                            <Twemoji emoji={quickEmoji} className="w-3.5 h-3.5 inline-block" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={threadEndRef} />
            </div>
          </div>
        </div>

        {/* Sticky Bottom Reply Bar */}
        <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky bottom-0 z-20">
          <form onSubmit={handleAddComment} className="flex items-center gap-1.5">
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              title="Attach artifact"
              onClick={() => setIsAddingArtifact(true)}
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Add work log note or update..."
                className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <button
              type="submit"
              disabled={!replyText.trim()}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 active:scale-95 transition-transform shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              title="Add note"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

      </div>
    </ModalSheet>
  );
};
