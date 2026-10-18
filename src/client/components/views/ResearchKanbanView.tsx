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
  { id: 'review', title: 'In Review' },
  { id: 'done', title: 'Done' },
];

const ACADEMIC_COLUMNS: { id: KanbanStage; title: string }[] = [
  { id: 'lit_review', title: 'Literature Review' },
  { id: 'experiments', title: 'Experiments' },
  { id: 'drafting', title: 'Drafting' },
  { id: 'under_review', title: 'Under Review' },
];

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

const ISSUE_TYPE_META: Record<KanbanIssueType, { label: string; icon: string }> = {
  experiment: { label: 'Exp', icon: '🧪' },
  writing: { label: 'Draft', icon: '📝' },
  reading: { label: 'Paper', icon: '📖' },
  code: { label: 'Dev', icon: '💻' },
  coursework: { label: 'Class', icon: '📚' },
};

const PRIORITY_META: Record<KanbanPriority, { label: string; colorClass: string; dotClass: string }> = {
  urgent: { label: 'Urgent', colorClass: 'border-l-rose-500', dotClass: 'bg-rose-500' },
  high: { label: 'High', colorClass: 'border-l-amber-500', dotClass: 'bg-amber-500' },
  medium: { label: 'Medium', colorClass: 'border-l-slate-400 dark:border-l-slate-600', dotClass: 'bg-slate-400' },
  low: { label: 'Low', colorClass: 'border-l-slate-200 dark:border-l-slate-800', dotClass: 'bg-slate-300' },
};

export const ResearchKanbanView: React.FC<ResearchKanbanViewProps> = ({ ws }) => {
  const {
    kanban,
    saveKanban,
    deleteKanban,
    sprints,
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
    <div className="space-y-3 text-xs">
      {/* Top Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold tracking-tight text-slate-900 dark:text-white uppercase">
            Sprints & Pipeline
          </h2>
          <span className="text-[10px] font-mono text-slate-400">
            ({kanban.length} issues)
          </span>
        </div>

        {/* Minimal View Tabs */}
        <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-md border border-slate-200/80 dark:border-slate-700/80 text-[11px]">
          <button
            type="button"
            onClick={() => setActiveViewTab('active_sprint')}
            className={`px-2 py-0.5 rounded font-medium transition cursor-pointer flex items-center gap-1 ${
              activeViewTab === 'active_sprint'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Target className="w-3 h-3 text-indigo-500" />
            <span>Active Sprint</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('backlog')}
            className={`px-2 py-0.5 rounded font-medium transition cursor-pointer flex items-center gap-1 ${
              activeViewTab === 'backlog'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3 text-amber-500" />
            <span>Backlog</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('analytics')}
            className={`px-2 py-0.5 rounded font-medium transition cursor-pointer flex items-center gap-1 ${
              activeViewTab === 'analytics'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3 h-3 text-emerald-500" />
            <span>Velocity</span>
          </button>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {/* Project Filter */}
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">Project: All</option>
            {projectList.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">Priority: All</option>
            <option value="urgent">🔴 Urgent</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">⚪ Low</option>
          </select>

          {/* Column Workflow Switcher */}
          {activeViewTab === 'active_sprint' && (
            <button
              type="button"
              onClick={() => setColumnWorkflow(columnWorkflow === 'agile' ? 'academic' : 'agile')}
              className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 text-[10px] font-mono text-slate-600 dark:text-slate-400 transition"
            >
              {columnWorkflow === 'agile' ? '⚡ Agile Board' : '📚 Academic Pipeline'}
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <button
            type="button"
            onClick={handleCreateSprint}
            className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3 text-indigo-500" />
            <span>Sprint</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddCard(activeSprint?.id)}
            className="px-2.5 py-1 rounded bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-medium transition shadow-2xs flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Deliverable</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. ACTIVE SPRINT TAB                                    */}
      {/* ======================================================== */}
      {activeViewTab === 'active_sprint' && (
        <div className="space-y-3">
          {/* Minimal Sprint Header Strip */}
          {activeSprint ? (
            <div className="p-2.5 sm:p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-semibold text-slate-900 dark:text-white text-xs">
                    {activeSprint.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleEditSprint(activeSprint)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition"
                    title="Edit Sprint Settings"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>

                  <span className="text-[10px] text-slate-400">•</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {activeSprint.startDate} – {activeSprint.endDate}
                  </span>

                  <span className="text-[10px] text-slate-400">•</span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {sprintStats.daysLeft > 0 ? (
                      <span>{sprintStats.daysLeft}d left</span>
                    ) : (
                      <span className="text-amber-500 font-medium">Cycle ended</span>
                    )}
                  </span>

                  <span className="text-[10px] text-slate-400">•</span>
                  <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300 font-medium">
                    {sprintStats.completedPts}/{sprintStats.totalPts} pts ({sprintStats.percent}%)
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <div className="w-20 sm:w-28 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${sprintStats.percent}%` }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSprintToComplete(activeSprint);
                      setIsCompleteModalOpen(true);
                    }}
                    className="px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Complete</span>
                  </button>
                </div>
              </div>

              {activeSprint.goal && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  <span className="text-slate-400 font-medium">Goal:</span> {activeSprint.goal}
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-center space-y-1.5">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                No active sprint running
              </p>
              <div className="flex items-center justify-center gap-2 pt-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveViewTab('backlog')}
                  className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition cursor-pointer"
                >
                  Start Sprint from Backlog
                </button>
              </div>
            </div>
          )}

          {/* Kanban Board Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3 items-start">
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
                  className="bg-slate-50/80 dark:bg-slate-900/40 rounded-lg border border-slate-200/70 dark:border-slate-800 p-2 sm:p-2.5 space-y-2 transition-colors"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      {col.title}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                      <span>{cards.length}</span>
                      <span>•</span>
                      <span>{colPoints} pts</span>
                    </div>
                  </div>

                  {/* Cards Container */}
                  <div className="space-y-2 min-h-[100px]">
                    {cards.length === 0 ? (
                      <div className="h-20 rounded border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-[10px] text-slate-400 select-none">
                        Empty
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
                            className={`p-2.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-l-2 ${prio.colorClass} space-y-1.5 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-2xs cursor-grab active:cursor-grabbing select-none`}
                          >
                            {/* Card Top: Issue Type, Points & Target Week */}
                            <div className="flex items-center justify-between gap-1.5 text-[10px]">
                              <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 truncate max-w-[120px]">
                                <span>{issue.icon}</span>
                                <span>{issue.label}</span>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span className="font-mono text-slate-400 truncate">{card.project}</span>
                              </span>

                              <div className="flex items-center gap-1 font-mono text-slate-400 shrink-0">
                                <span className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-medium">
                                  {card.storyPoints || 1}p
                                </span>
                                <span>{card.targetWeek || 'W1'}</span>
                              </div>
                            </div>

                            {/* Title */}
                            <h4
                              onClick={() => handleEditCard(card)}
                              className="text-xs font-medium text-slate-800 dark:text-slate-100 leading-snug cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                            >
                              {card.title}
                            </h4>

                            {/* Blocked Alert */}
                            {card.isBlocked && (
                              <div className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-[10px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
                                <AlertTriangle className="w-3 h-3 shrink-0 text-rose-500" />
                                <span className="truncate">{card.blockedReason || 'Blocked'}</span>
                              </div>
                            )}

                            {/* Notes Snippet */}
                            {card.notes && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                {card.notes}
                              </p>
                            )}

                            {/* Subtasks Progress */}
                            {subtasks.length > 0 && (
                              <div className="space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedSubtasksCardId(isExpandedSubtasks ? null : card.id)
                                  }
                                  className="w-full flex items-center justify-between text-slate-500 dark:text-slate-400 hover:text-slate-800 transition"
                                >
                                  <span className="flex items-center gap-1">
                                    <CheckSquare className="w-2.5 h-2.5 text-emerald-500" />
                                    <span>
                                      {completedSubtasks}/{subtasks.length}
                                    </span>
                                  </span>
                                  {isExpandedSubtasks ? (
                                    <ChevronUp className="w-2.5 h-2.5 text-slate-400" />
                                  ) : (
                                    <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                                  )}
                                </button>

                                <div className="h-0.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500"
                                    style={{
                                      width: `${(completedSubtasks / subtasks.length) * 100}%`,
                                    }}
                                  />
                                </div>

                                {isExpandedSubtasks && (
                                  <div className="space-y-0.5 pt-1">
                                    {subtasks.map((st) => (
                                      <div
                                        key={st.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleSubtask(card.id, st.id);
                                        }}
                                        className="flex items-center gap-1 p-0.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-[10px]"
                                      >
                                        {st.completed ? (
                                          <CheckSquare className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                        ) : (
                                          <Square className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                        )}
                                        <span
                                          className={`truncate ${
                                            st.completed
                                              ? 'line-through text-slate-400'
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

                            {/* Card Actions Footer */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
                              <div className="flex items-center gap-0.5">
                                {colIdx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const prevCol = columns[colIdx - 1].id;
                                      saveKanban({ ...card, stage: prevCol }, true);
                                    }}
                                    className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    title="Move left"
                                  >
                                    <ArrowLeft className="w-2.5 h-2.5" />
                                  </button>
                                )}
                                {colIdx < columns.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextCol = columns[colIdx + 1].id;
                                      saveKanban({ ...card, stage: nextCol }, true);
                                    }}
                                    className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    title="Move right"
                                  >
                                    <ArrowRight className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditCard(card)}
                                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded transition"
                                  title="Edit"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteKanban(card.id)}
                                  className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition"
                                  title="Delete"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
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
        <div className="space-y-4">
          {/* Sprints Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3 text-indigo-500" />
                <span>Sprint Cycles</span>
              </span>
              <button
                type="button"
                onClick={handleCreateSprint}
                className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                + New Sprint
              </button>
            </div>

            {sprints.length === 0 ? (
              <div className="p-3 rounded border border-dashed border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400">
                No sprints yet. Create a sprint to group backlog deliverables.
              </div>
            ) : (
              <div className="space-y-2">
                {sprints.map((sp) => {
                  const sprintItems = kanban.filter((k) => k.sprintId === sp.id);
                  const totalPts = sprintItems.reduce((acc, c) => acc + (c.storyPoints || 1), 0);

                  return (
                    <div
                      key={sp.id}
                      className={`p-2.5 rounded-lg border transition ${
                        sp.status === 'active'
                          ? 'bg-slate-50 dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/50'
                          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800 text-[11px]">
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              sp.status === 'active'
                                ? 'bg-emerald-500'
                                : sp.status === 'completed'
                                ? 'bg-slate-400'
                                : 'bg-amber-400'
                            }`}
                          />
                          <span className="font-semibold text-slate-900 dark:text-white truncate">
                            {sp.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            ({sprintItems.length} issues • {totalPts}p)
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0 hidden sm:inline">
                            {sp.startDate} to {sp.endDate}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {sp.status === 'planned' && (
                            <button
                              type="button"
                              onClick={() => startSprint(sp.id)}
                              className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-medium transition cursor-pointer flex items-center gap-1"
                            >
                              <Play className="w-2.5 h-2.5" />
                              <span>Start</span>
                            </button>
                          )}
                          {sp.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSprintToComplete(sp);
                                setIsCompleteModalOpen(true);
                              }}
                              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-medium transition cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Complete</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEditSprint(sp)}
                            className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSprint(sp.id)}
                            className="p-0.5 text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>

                      {/* Items in this sprint */}
                      <div className="space-y-1 pt-1.5">
                        {sprintItems.length === 0 ? (
                          <div className="py-1 text-center text-[10px] text-slate-400">
                            No issues assigned. Move items from backlog below.
                          </div>
                        ) : (
                          sprintItems.map((item) => {
                            const prio = PRIORITY_META[item.priority || 'medium'];

                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-2 py-1 px-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 text-[11px] transition"
                              >
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${prio.dotClass}`} />
                                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                    {item.project}
                                  </span>
                                  <span
                                    onClick={() => handleEditCard(item)}
                                    className="text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:underline"
                                  >
                                    {item.title}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 text-slate-400 text-[10px]">
                                  <span className="font-mono">{item.storyPoints || 1}p</span>
                                  <button
                                    type="button"
                                    onClick={() => saveKanban({ ...item, sprintId: undefined })}
                                    className="hover:text-slate-700 dark:hover:text-slate-200"
                                    title="Move to Backlog"
                                  >
                                    To Backlog
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleEditCard(item)}
                                    className="p-0.5 hover:text-slate-700"
                                  >
                                    <Edit2 className="w-2.5 h-2.5" />
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
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-amber-500" />
                <span>Backlog (Unassigned)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-normal">
                {kanban.filter((k) => !k.sprintId).length} items
              </span>
            </div>

            {/* Quick Backlog Add Input */}
            <form onSubmit={handleQuickAddBacklog} className="flex items-center gap-1.5">
              <input
                type="text"
                value={quickBacklogTitle}
                onChange={(e) => setQuickBacklogTitle(e.target.value)}
                placeholder="+ Add deliverable to backlog (Hit Enter to save)..."
                className="flex-1 px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-medium transition cursor-pointer shrink-0"
              >
                Add
              </button>
            </form>

            {/* Backlog List Rows */}
            <div className="space-y-1">
              {kanban.filter((k) => !k.sprintId && filterCard(k)).length === 0 ? (
                <div className="p-4 rounded border border-dashed border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400">
                  Backlog is clean!
                </div>
              ) : (
                kanban
                  .filter((k) => !k.sprintId && filterCard(k))
                  .map((item) => {
                    const prio = PRIORITY_META[item.priority || 'medium'];

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 py-1 px-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px]"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${prio.dotClass}`} />
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {item.project}
                          </span>
                          <span
                            onClick={() => handleEditCard(item)}
                            className="font-medium text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:underline"
                          >
                            {item.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 text-slate-400 text-[10px]">
                          <span className="font-mono">{item.storyPoints || 1}p</span>

                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                saveKanban({ ...item, sprintId: e.target.value });
                              }
                            }}
                            className="px-1.5 py-0.5 rounded text-[10px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none"
                          >
                            <option value="">Move to...</option>
                            {sprints.map((sp) => (
                              <option key={sp.id} value={sp.id}>
                                {sp.status === 'active' ? '🏃 Active: ' : '⏳ '} {sp.name}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleEditCard(item)}
                            className="p-0.5 hover:text-slate-700"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteKanban(item.id)}
                            className="p-0.5 hover:text-rose-500"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
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
        <div className="space-y-3">
          {/* Velocity Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-medium uppercase">Completed Sprints</span>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {sprints.filter((s) => s.status === 'completed').length}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-medium uppercase">Total Points Delivered</span>
              <div className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                {sprints
                  .filter((s) => s.status === 'completed')
                  .reduce((acc, s) => acc + (s.velocityPoints || 0), 0)}{' '}
                <span className="text-[11px] font-normal text-slate-400">pts</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-medium uppercase">Avg Sprint Velocity</span>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {(() => {
                  const completed = sprints.filter((s) => s.status === 'completed');
                  if (completed.length === 0) return '0';
                  const sum = completed.reduce((acc, s) => acc + (s.velocityPoints || 0), 0);
                  return Math.round(sum / completed.length);
                })()}{' '}
                <span className="text-[11px] font-normal text-slate-400">pts / sprint</span>
              </div>
            </div>
          </div>

          {/* Past Sprints List */}
          <div className="space-y-2 pt-1">
            <h3 className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Sprint History & Retrospectives
            </h3>

            {sprints.filter((s) => s.status === 'completed').length === 0 ? (
              <div className="p-4 rounded border border-dashed border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400">
                No sprints completed yet. Completed sprints and velocity points will be tracked here.
              </div>
            ) : (
              <div className="space-y-1.5">
                {sprints
                  .filter((s) => s.status === 'completed')
                  .map((sp) => {
                    const finishedCards = kanban.filter((k) => k.sprintId === sp.id);

                    return (
                      <div
                        key={sp.id}
                        className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {sp.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({sp.startDate} – {sp.endDate})
                            </span>
                          </div>

                          <div className="text-right text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                            {sp.velocityPoints || 0} pts ({finishedCards.length} issues)
                          </div>
                        </div>

                        {sp.retrospective && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5 border-t border-slate-100 dark:border-slate-800">
                            <strong>Note:</strong> {sp.retrospective}
                          </p>
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
