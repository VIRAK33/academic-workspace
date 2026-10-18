import React, { useState, useMemo } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import {
  KanbanStage,
  KanbanMilestone,
  Sprint,
  KanbanPriority,
  KanbanIssueType,
} from '../../../types';
import {
  Plus,
  Target,
  Play,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckSquare,
  Square,
  BarChart3,
  Clock,
  Sparkles,
  MoveRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { KanbanModal } from '../modals/KanbanModal';
import { SprintModal } from '../modals/SprintModal';
import { CompleteSprintModal } from '../modals/CompleteSprintModal';

interface ResearchKanbanViewProps {
  ws: ReturnType<typeof useWorkspace>;
  onOpenKanbanModal?: () => void;
}

type KanbanViewTab = 'active_sprint' | 'backlog' | 'analytics';
type ColumnWorkflow = 'agile' | 'academic';

const AGILE_COLUMNS: { id: KanbanStage; title: string }[] = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'review', title: 'Under Review / Testing' },
  { id: 'done', title: 'Done' },
];

const ACADEMIC_COLUMNS: { id: KanbanStage; title: string }[] = [
  { id: 'lit_review', title: 'Literature Review' },
  { id: 'experiments', title: 'Experiments' },
  { id: 'drafting', title: 'Drafting' },
  { id: 'under_review', title: 'Under Review' },
];

// Helper to normalize card stage across both agile and academic workflows
function matchColumnStage(cardStage: string, colId: KanbanStage, workflow: ColumnWorkflow): boolean {
  if (cardStage === colId) return true;
  if (workflow === 'agile') {
    if (colId === 'todo' && cardStage === 'lit_review') return true;
    if (colId === 'in_progress' && (cardStage === 'experiments' || cardStage === 'drafting')) return true;
    if (colId === 'review' && cardStage === 'under_review') return true;
  } else {
    if (colId === 'lit_review' && cardStage === 'todo') return true;
    if (colId === 'experiments' && cardStage === 'in_progress') return true;
    if (colId === 'under_review' && (cardStage === 'review' || cardStage === 'done')) return true;
  }
  return false;
}

const ISSUE_TYPE_META: Record<KanbanIssueType, { label: string; icon: string; badgeClass: string }> = {
  experiment: { label: 'Experiment', icon: '🧪', badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  writing: { label: 'Writing', icon: '📝', badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  reading: { label: 'Lit Review', icon: '📖', badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  code: { label: 'Code', icon: '💻', badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  coursework: { label: 'Course', icon: '📚', badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
};

const PRIORITY_META: Record<KanbanPriority, { label: string; colorClass: string; dotClass: string }> = {
  urgent: { label: 'Urgent', colorClass: 'border-l-rose-500', dotClass: 'bg-rose-500' },
  high: { label: 'High', colorClass: 'border-l-amber-500', dotClass: 'bg-amber-500' },
  medium: { label: 'Medium', colorClass: 'border-l-indigo-400', dotClass: 'bg-indigo-400' },
  low: { label: 'Low', colorClass: 'border-l-slate-300 dark:border-l-slate-700', dotClass: 'bg-slate-400' },
};

export const ResearchKanbanView: React.FC<ResearchKanbanViewProps> = ({ ws }) => {
  const {
    kanban,
    saveKanban,
    deleteKanban,
    sprints,
    saveSprint,
    deleteSprint,
    startSprint,
    toggleSubtask,
    searchQuery,
  } = ws;

  // View tabs & options
  const [activeViewTab, setActiveViewTab] = useState<KanbanViewTab>('active_sprint');
  const [columnWorkflow, setColumnWorkflow] = useState<ColumnWorkflow>('agile');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [expandedSubtasksCardId, setExpandedSubtasksCardId] = useState<string | null>(null);

  // Modals state
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<KanbanMilestone | null>(null);
  const [cardModalSprintId, setCardModalSprintId] = useState<string | undefined>(undefined);
  const [cardModalStage, setCardModalStage] = useState<KanbanStage | undefined>(undefined);

  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [sprintToComplete, setSprintToComplete] = useState<Sprint | null>(null);

  // Quick backlog add title
  const [quickBacklogTitle, setQuickBacklogTitle] = useState('');

  // Active Sprint
  const activeSprint = useMemo(() => {
    return sprints.find((s) => s.status === 'active') || null;
  }, [sprints]);

  // Unique Projects for filtering
  const projectList = useMemo(() => {
    const set = new Set<string>();
    kanban.forEach((k) => {
      if (k.project) set.add(k.project);
    });
    return Array.from(set).sort();
  }, [kanban]);

  // Filtered Cards logic
  const q = searchQuery.toLowerCase().trim();

  const filterCard = (card: KanbanMilestone): boolean => {
    if (selectedProject !== 'all' && card.project !== selectedProject) return false;
    if (selectedPriority !== 'all' && (card.priority || 'medium') !== selectedPriority) return false;
    if (q) {
      const matchTitle = card.title.toLowerCase().includes(q);
      const matchProject = card.project.toLowerCase().includes(q);
      const matchNotes = card.notes?.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchProject && !matchNotes) return false;
    }
    return true;
  };

  // Active sprint cards
  const activeSprintCards = useMemo(() => {
    if (!activeSprint) return [];
    return kanban.filter((k) => k.sprintId === activeSprint.id && filterCard(k));
  }, [kanban, activeSprint, selectedProject, selectedPriority, q]);

  // Active sprint progress stats
  const sprintStats = useMemo(() => {
    if (!activeSprint) return { totalCards: 0, completedCards: 0, totalPts: 0, completedPts: 0, percent: 0, daysLeft: 0 };
    const allInSprint = kanban.filter((k) => k.sprintId === activeSprint.id);
    const totalCards = allInSprint.length;
    const completedCards = allInSprint.filter((k) => k.stage === 'done' || k.stage === 'under_review').length;
    const totalPts = allInSprint.reduce((acc, c) => acc + (c.storyPoints || 1), 0);
    const completedPts = allInSprint
      .filter((k) => k.stage === 'done' || k.stage === 'under_review')
      .reduce((acc, c) => acc + (c.storyPoints || 1), 0);
    const percent = totalPts > 0 ? Math.round((completedPts / totalPts) * 100) : 0;

    const endDate = new Date(activeSprint.endDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return { totalCards, completedCards, totalPts, completedPts, percent, daysLeft };
  }, [kanban, activeSprint]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('text/plain', cardId);
  };

  const handleDrop = async (e: React.DragEvent, targetColId: KanbanStage) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;
    const card = kanban.find((k) => k.id === cardId);
    if (!card || card.stage === targetColId) return;

    await saveKanban({ ...card, stage: targetColId }, true);
  };

  // Open modals
  const handleOpenAddCard = (sprintId?: string, defaultCol?: KanbanStage) => {
    setEditingMilestone(null);
    setCardModalSprintId(sprintId);
    setCardModalStage(defaultCol || 'todo');
    setIsCardModalOpen(true);
  };

  const handleEditCard = (card: KanbanMilestone) => {
    setEditingMilestone(card);
    setCardModalSprintId(card.sprintId);
    setCardModalStage(card.stage);
    setIsCardModalOpen(true);
  };

  const handleCreateSprint = () => {
    setEditingSprint(null);
    setIsSprintModalOpen(true);
  };

  const handleEditSprint = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setIsSprintModalOpen(true);
  };

  const handleQuickAddBacklog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBacklogTitle.trim()) return;

    const newCard: KanbanMilestone = {
      id: 'k_' + Date.now().toString(36),
      title: quickBacklogTitle.trim(),
      stage: 'todo',
      project: selectedProject !== 'all' ? selectedProject : 'General',
      targetWeek: 'Backlog',
      priority: 'medium',
      issueType: 'experiment',
      storyPoints: 2,
    };

    saveKanban(newCard);
    setQuickBacklogTitle('');
  };

  const columns = columnWorkflow === 'agile' ? AGILE_COLUMNS : ACADEMIC_COLUMNS;

  return (
    <div className="space-y-4">
      {/* Top Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Sprints & Research Pipeline
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Agile Sprint
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage agile research sprints, backlogs, deliverables, and publication stages
          </p>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
          <button
            type="button"
            onClick={() => setActiveViewTab('active_sprint')}
            className={`px-3 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeViewTab === 'active_sprint'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-indigo-500" />
            <span>Active Sprint</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('backlog')}
            className={`px-3 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeViewTab === 'backlog'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>Backlog</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('analytics')}
            className={`px-3 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeViewTab === 'analytics'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Velocity</span>
          </button>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Project Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400">Project:</span>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
            >
              <option value="all">All Projects ({kanban.length})</option>
              {projectList.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400">Priority:</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">🔴 Urgent</option>
              <option value="high">🟠 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">⚪ Low</option>
            </select>
          </div>

          {/* Column Workflow Switcher (Only on Active Sprint) */}
          {activeViewTab === 'active_sprint' && (
            <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-400">Columns:</span>
              <button
                type="button"
                onClick={() => setColumnWorkflow(columnWorkflow === 'agile' ? 'academic' : 'agile')}
                className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition"
              >
                {columnWorkflow === 'agile' ? '⚡ Agile Stages' : '📚 Academic Stages'}
              </button>
            </div>
          )}
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreateSprint}
            className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition shadow-2xs flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-500" />
            <span>New Sprint</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddCard(activeSprint?.id)}
            className="px-3 py-1.5 rounded-md bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold transition shadow-xs flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Deliverable</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. ACTIVE SPRINT TAB                                    */}
      {/* ======================================================== */}
      {activeViewTab === 'active_sprint' && (
        <div className="space-y-4">
          {/* Active Sprint Header Banner */}
          {activeSprint ? (
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border border-indigo-900/60 relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                      Active Sprint
                    </span>
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                      <span>{activeSprint.name}</span>
                      <button
                        type="button"
                        onClick={() => handleEditSprint(activeSprint)}
                        className="text-slate-400 hover:text-white transition p-0.5"
                        title="Edit Sprint Settings"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </h3>
                  </div>

                  {activeSprint.goal && (
                    <p className="text-xs text-indigo-200/90 leading-relaxed font-normal">
                      🎯 <strong className="font-semibold text-white">Goal:</strong> {activeSprint.goal}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-300">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-indigo-400" />
                      {activeSprint.startDate} to {activeSprint.endDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {sprintStats.daysLeft > 0 ? (
                        <span>
                          <strong className="text-white">{sprintStats.daysLeft}</strong> days left
                        </span>
                      ) : (
                        <span className="text-amber-400 font-semibold">Sprint cycle ended</span>
                      )}
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-white">{sprintStats.completedPts}</strong> of{' '}
                      <strong className="text-white">{sprintStats.totalPts}</strong> story points completed
                    </span>
                  </div>
                </div>

                {/* Progress bar & Complete Sprint Button */}
                <div className="flex md:flex-col items-center md:items-end justify-between gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSprintToComplete(activeSprint);
                      setIsCompleteModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Complete Sprint</span>
                  </button>

                  <div className="w-36 md:w-44 space-y-1 text-right">
                    <div className="flex justify-between text-[10px] text-indigo-200 font-mono">
                      <span>Progress</span>
                      <span>{sprintStats.percent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 border border-indigo-900/80 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                        style={{ width: `${sprintStats.percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  No Active Sprint In Progress
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-0.5">
                  Start an existing sprint from your Backlog, or create Sprint 1 to begin time-boxed weekly iterations!
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveViewTab('backlog')}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition cursor-pointer"
                >
                  Go to Backlog & Start Sprint
                </button>
                <button
                  type="button"
                  onClick={handleCreateSprint}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Create New Sprint
                </button>
              </div>
            </div>
          )}

          {/* Kanban Board Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {columns.map((col, colIdx) => {
              const cards = activeSprintCards.filter((item) =>
                matchColumnStage(item.stage, col.id, columnWorkflow)
              );
              const colPoints = cards.reduce((acc, c) => acc + (c.storyPoints || 1), 0);

              return (
                <div
                  key={col.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className="bg-slate-100/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 space-y-2.5 transition-colors"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>{col.title}</span>
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                      <span className="px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 font-medium">
                        {cards.length}
                      </span>
                      <span>•</span>
                      <span>{colPoints} pts</span>
                    </div>
                  </div>

                  {/* Cards Container */}
                  <div className="space-y-2.5 min-h-[140px]">
                    {cards.length === 0 ? (
                      <div className="h-28 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-[11px] text-slate-400 gap-1 select-none">
                        <span>Drop deliverables here</span>
                        <button
                          type="button"
                          onClick={() => handleOpenAddCard(activeSprint?.id, col.id)}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          + Add card
                        </button>
                      </div>
                    ) : (
                      cards.map((card) => {
                        const prio = PRIORITY_META[card.priority || 'medium'];
                        const issue = ISSUE_TYPE_META[card.issueType || 'experiment'];
                        const subtasks = card.subtasks || [];
                        const completedSubtasks = subtasks.filter((s) => s.completed).length;
                        const isExpandedSubtasks = expandedSubtasksCardId === card.id;

                        return (
                          <div
                            key={card.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, card.id)}
                            className={`p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 border-l-4 ${prio.colorClass} space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-xs cursor-grab active:cursor-grabbing select-none`}
                          >
                            {/* Card Top: Issue Type, Points & Target Week */}
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 ${issue.badgeClass}`}
                              >
                                <span>{issue.icon}</span>
                                <span>{issue.label}</span>
                              </span>

                              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                                  ⚡ {card.storyPoints || 1} pt
                                </span>
                                <span className="text-slate-400">{card.targetWeek || 'W1'}</span>
                              </div>
                            </div>

                            {/* Project Tag */}
                            <div>
                              <span className="text-[10px] font-mono uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                                {card.project}
                              </span>
                            </div>

                            {/* Title */}
                            <h4
                              onClick={() => handleEditCard(card)}
                              className="text-xs font-semibold text-slate-900 dark:text-white leading-snug cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                            >
                              {card.title}
                            </h4>

                            {/* Blocked Banner */}
                            {card.isBlocked && (
                              <div className="px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                                <span className="leading-tight font-medium">
                                  {card.blockedReason || 'Deliverable Blocked'}
                                </span>
                              </div>
                            )}

                            {/* Notes Snippet */}
                            {card.notes && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                {card.notes}
                              </p>
                            )}

                            {/* Subtasks Progress & Expandable Checklist */}
                            {subtasks.length > 0 && (
                              <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedSubtasksCardId(isExpandedSubtasks ? null : card.id)
                                  }
                                  className="w-full flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition"
                                >
                                  <span className="flex items-center gap-1 font-medium">
                                    <CheckSquare className="w-3 h-3 text-emerald-500" />
                                    <span>
                                      Checklist {completedSubtasks}/{subtasks.length}
                                    </span>
                                  </span>
                                  {isExpandedSubtasks ? (
                                    <ChevronUp className="w-3 h-3 text-slate-400" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                  )}
                                </button>

                                {/* Micro Progress Bar */}
                                <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500"
                                    style={{
                                      width: `${(completedSubtasks / subtasks.length) * 100}%`,
                                    }}
                                  />
                                </div>

                                {/* Expanded interactive checklist */}
                                {isExpandedSubtasks && (
                                  <div className="space-y-1 pt-1">
                                    {subtasks.map((st) => (
                                      <div
                                        key={st.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleSubtask(card.id, st.id);
                                        }}
                                        className="flex items-center gap-1.5 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-[11px]"
                                      >
                                        {st.completed ? (
                                          <CheckSquare className="w-3 h-3 text-emerald-600 shrink-0" />
                                        ) : (
                                          <Square className="w-3 h-3 text-slate-400 shrink-0" />
                                        )}
                                        <span
                                          className={`truncate ${
                                            st.completed
                                              ? 'line-through text-slate-400 dark:text-slate-500'
                                              : 'text-slate-700 dark:text-slate-300'
                                          }`}
                                        >
                                          {st.title}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Card Footer Actions */}
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-1">
                                {colIdx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const prevCol = columns[colIdx - 1].id;
                                      saveKanban({ ...card, stage: prevCol }, true);
                                    }}
                                    className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                    title="Move column left"
                                  >
                                    <ArrowLeft className="w-3 h-3" />
                                  </button>
                                )}
                                {colIdx < columns.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextCol = columns[colIdx + 1].id;
                                      saveKanban({ ...card, stage: nextCol }, true);
                                    }}
                                    className="p-1 rounded text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                                    title="Advance column right"
                                  >
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditCard(card)}
                                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded transition cursor-pointer"
                                  title="Edit card"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteKanban(card.id)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                                  title="Delete card"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. BACKLOG VIEW TAB (Grooming & Planned Sprints)        */}
      {/* ======================================================== */}
      {activeViewTab === 'backlog' && (
        <div className="space-y-6">
          {/* Sprints Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                <span>Sprint Cycles ({sprints.length})</span>
              </h3>
              <button
                type="button"
                onClick={handleCreateSprint}
                className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-medium transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Create Sprint</span>
              </button>
            </div>

            {sprints.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                No sprints created yet. Create a sprint to group backlog items into focused cycles.
              </div>
            ) : (
              <div className="space-y-3">
                {sprints.map((sp) => {
                  const sprintItems = kanban.filter((k) => k.sprintId === sp.id);
                  const totalPts = sprintItems.reduce((acc, c) => acc + (c.storyPoints || 1), 0);

                  return (
                    <div
                      key={sp.id}
                      className={`p-3.5 rounded-xl border transition ${
                        sp.status === 'active'
                          ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                sp.status === 'active'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                  : sp.status === 'completed'
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                              }`}
                            >
                              {sp.status}
                            </span>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                              {sp.name}
                            </h4>
                            <span className="text-xs font-mono text-slate-400">
                              ({sprintItems.length} issues • {totalPts} pts)
                            </span>
                          </div>
                          {sp.goal && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                              Goal: {sp.goal}
                            </p>
                          )}
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span>📅 {sp.startDate} to {sp.endDate}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {sp.status === 'planned' && (
                            <button
                              type="button"
                              onClick={() => startSprint(sp.id)}
                              className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                            >
                              <Play className="w-3 h-3" />
                              <span>Start Sprint</span>
                            </button>
                          )}
                          {sp.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSprintToComplete(sp);
                                setIsCompleteModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Complete</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEditSprint(sp)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                            title="Edit Sprint"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSprint(sp.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                            title="Delete Sprint"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Items in this sprint */}
                      <div className="space-y-1.5 pt-2.5">
                        {sprintItems.length === 0 ? (
                          <div className="py-2 text-center text-[11px] text-slate-400">
                            No issues assigned to this sprint yet. Move items here from the backlog below!
                          </div>
                        ) : (
                          sprintItems.map((item) => {
                            const issue = ISSUE_TYPE_META[item.issueType || 'experiment'];
                            const prio = PRIORITY_META[item.priority || 'medium'];

                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs hover:border-slate-300 dark:hover:border-slate-700 transition"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${prio.dotClass}`} />
                                  <span className="text-[11px] shrink-0">{issue.icon}</span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                                    {item.project}
                                  </span>
                                  <span
                                    onClick={() => handleEditCard(item)}
                                    className="font-medium text-slate-900 dark:text-white truncate cursor-pointer hover:underline"
                                  >
                                    {item.title}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 text-slate-400">
                                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300">
                                    ⚡ {item.storyPoints || 1} pt
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => saveKanban({ ...item, sprintId: undefined })}
                                    className="px-2 py-0.5 rounded text-[11px] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                    title="Send back to Backlog"
                                  >
                                    To Backlog
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleEditCard(item)}
                                    className="p-1 hover:text-slate-700 dark:hover:text-slate-200"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unassigned Backlog Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  <span>Backlog (Unassigned Ideas & Deliverables)</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Deliverables not yet scheduled into an active or planned sprint
                </p>
              </div>

              <span className="text-xs font-mono text-slate-400 font-medium">
                {kanban.filter((k) => !k.sprintId).length} items
              </span>
            </div>

            {/* Quick Backlog Add Input */}
            <form onSubmit={handleQuickAddBacklog} className="flex items-center gap-2">
              <input
                type="text"
                value={quickBacklogTitle}
                onChange={(e) => setQuickBacklogTitle(e.target.value)}
                placeholder="+ Add deliverable or experiment idea to backlog (Hit Enter to save)..."
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium transition cursor-pointer shrink-0"
              >
                Add to Backlog
              </button>
            </form>

            {/* Backlog Items List */}
            <div className="space-y-1.5">
              {kanban.filter((k) => !k.sprintId && filterCard(k)).length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                  Backlog is clean! All deliverables are assigned to sprints or completed.
                </div>
              ) : (
                kanban
                  .filter((k) => !k.sprintId && filterCard(k))
                  .map((item) => {
                    const issue = ISSUE_TYPE_META[item.issueType || 'experiment'];
                    const prio = PRIORITY_META[item.priority || 'medium'];

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs hover:border-slate-300 dark:hover:border-slate-700 transition shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${prio.dotClass}`} />
                          <span className="text-[11px] shrink-0">{issue.icon}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                            {item.project}
                          </span>
                          <span
                            onClick={() => handleEditCard(item)}
                            className="font-medium text-slate-900 dark:text-white truncate cursor-pointer hover:underline"
                          >
                            {item.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            ⚡ {item.storyPoints || 1} pt
                          </span>

                          {/* Quick assign to sprint dropdown */}
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                saveKanban({ ...item, sprintId: e.target.value });
                              }
                            }}
                            className="px-2 py-0.5 rounded text-[11px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
                          >
                            <option value="">Move to Sprint...</option>
                            {sprints.map((sp) => (
                              <option key={sp.id} value={sp.id}>
                                {sp.status === 'active' ? '🏃 Active: ' : '⏳ '} {sp.name}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleEditCard(item)}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteKanban(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. SPRINT ANALYTICS & VELOCITY TAB                      */}
      {/* ======================================================== */}
      {activeViewTab === 'analytics' && (
        <div className="space-y-4">
          {/* Velocity Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Completed Sprints</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {sprints.filter((s) => s.status === 'completed').length}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Total Velocity Delivered</span>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {sprints
                  .filter((s) => s.status === 'completed')
                  .reduce((acc, s) => acc + (s.velocityPoints || 0), 0)}{' '}
                <span className="text-xs font-normal text-slate-400">story points</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Avg Sprint Velocity</span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {(() => {
                  const completed = sprints.filter((s) => s.status === 'completed');
                  if (completed.length === 0) return '0';
                  const sum = completed.reduce((acc, s) => acc + (s.velocityPoints || 0), 0);
                  return Math.round(sum / completed.length);
                })()}{' '}
                <span className="text-xs font-normal text-slate-400">pts / sprint</span>
              </div>
            </div>
          </div>

          {/* Past Completed Sprints History */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Sprint History & Retrospectives
            </h3>

            {sprints.filter((s) => s.status === 'completed').length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                No sprints completed yet. When you complete an active sprint, velocity metrics and retrospectives will appear here!
              </div>
            ) : (
              <div className="space-y-3">
                {sprints
                  .filter((s) => s.status === 'completed')
                  .map((sp) => {
                    const finishedCards = kanban.filter((k) => k.sprintId === sp.id);

                    return (
                      <div
                        key={sp.id}
                        className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Completed
                              </span>
                              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                                {sp.name}
                              </h4>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              📅 {sp.startDate} to {sp.endDate} • Completed on{' '}
                              {sp.completedAt ? sp.completedAt.split('T')[0] : 'N/A'}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                              {sp.velocityPoints || 0} pts
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {finishedCards.length} deliverables
                            </div>
                          </div>
                        </div>

                        {sp.retrospective && (
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                            <strong>Retrospective:</strong> {sp.retrospective}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Internal Modals */}
      <KanbanModal
        ws={ws}
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        initialMilestone={editingMilestone}
        defaultSprintId={cardModalSprintId}
        defaultStage={cardModalStage}
      />

      <SprintModal
        ws={ws}
        isOpen={isSprintModalOpen}
        onClose={() => setIsSprintModalOpen(false)}
        initialSprint={editingSprint}
      />

      <CompleteSprintModal
        ws={ws}
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        sprint={sprintToComplete}
      />
    </div>
  );
};
