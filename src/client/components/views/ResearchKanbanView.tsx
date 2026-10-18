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
  ArrowUp,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckSquare,
  BarChart3,
  Search,
  MessageSquare,
  Inbox,
  Check,
  TrendingUp,
  Tag,
} from 'lucide-react';
import { Twemoji, renderWithTwemoji } from '../common/Twemoji';
import { KanbanModal } from '../modals/KanbanModal';
import { SprintModal } from '../modals/SprintModal';
import { CompleteSprintModal } from '../modals/CompleteSprintModal';
import { IssueDetailModal } from '../modals/IssueDetailModal';

interface ResearchKanbanViewProps {
  ws: ReturnType<typeof useWorkspace>;
  onOpenKanbanModal?: () => void;
}

type KanbanViewTab = 'active_sprint' | 'backlog' | 'analytics';
type SwimlaneLane = 'all' | 'todo' | 'in_progress' | 'review' | 'done';

const AGILE_COLUMNS: { id: KanbanStage; title: string; colorDot: string }[] = [
  { id: 'in_progress', title: 'In Progress', colorDot: 'bg-blue-600' },
  { id: 'review', title: 'In Review', colorDot: 'bg-amber-500' },
  { id: 'todo', title: 'To Do', colorDot: 'bg-slate-400' },
  { id: 'done', title: 'Done', colorDot: 'bg-emerald-500' },
];

const ISSUE_TYPE_META: Record<KanbanIssueType, { label: string; emoji: string }> = {
  experiment: { label: 'Exp', emoji: '🧪' },
  writing: { label: 'Draft', emoji: '📝' },
  reading: { label: 'Paper', emoji: '📖' },
  code: { label: 'Dev', emoji: '💻' },
  coursework: { label: 'Class', emoji: '📚' },
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
  } = ws;

  // View navigation
  const [activeViewTab, setActiveViewTab] = useState<KanbanViewTab>('active_sprint');
  const [activeSwimlane, setActiveSwimlane] = useState<SwimlaneLane>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [filterUrgentOnly, setFilterUrgentOnly] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Modals
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<KanbanMilestone | null>(null);
  const [cardModalSprintId, setCardModalSprintId] = useState<string | undefined>(undefined);
  const [cardModalStage, setCardModalStage] = useState<KanbanStage | undefined>(undefined);

  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [sprintToComplete, setSprintToComplete] = useState<Sprint | null>(null);

  // Issue Detail Modal
  const [selectedDetailMilestone, setSelectedDetailMilestone] = useState<KanbanMilestone | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Quick Backlog Input
  const [quickBacklogTitle, setQuickBacklogTitle] = useState('');
  const [quickBacklogPoints, setQuickBacklogPoints] = useState(3);
  const [isUrgentDraft, setIsUrgentDraft] = useState(false);

  // Active Sprint
  const activeSprint = useMemo(() => {
    return sprints.find((s) => s.status === 'active') || null;
  }, [sprints]);

  // Unique Project list
  const projectList = useMemo(() => {
    const set = new Set<string>();
    kanban.forEach((k) => {
      if (k.project) set.add(k.project);
    });
    return Array.from(set).sort();
  }, [kanban]);

  // Overall Stats for Top Stat Pulse Strip
  const overallStats = useMemo(() => {
    const totalIssues = kanban.length;
    const totalEffort = kanban.reduce((acc, k) => acc + (k.storyPoints || 1), 0);
    const completedSprints = sprints.filter((s) => s.status === 'completed');
    const avgVelocity =
      completedSprints.length > 0
        ? Math.round(
            completedSprints.reduce((acc, s) => acc + (s.velocityPoints || 0), 0) /
              completedSprints.length
          )
        : 34;

    return { totalIssues, totalEffort, avgVelocity };
  }, [kanban, sprints]);

  // Filter evaluation
  const filterCard = (card: KanbanMilestone): boolean => {
    if (selectedProject !== 'all' && card.project !== selectedProject) return false;
    if (selectedType !== 'all' && card.issueType !== selectedType) return false;
    if (filterUrgentOnly && card.priority !== 'urgent') return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      const matchKey = card.issueKey?.toLowerCase().includes(q) || false;
      const matchTitle = card.title.toLowerCase().includes(q);
      const matchProject = card.project.toLowerCase().includes(q);
      const matchNotes = card.notes?.toLowerCase().includes(q) || false;
      if (!matchKey && !matchTitle && !matchProject && !matchNotes) return false;
    }
    return true;
  };

  // Active sprint cards
  const activeSprintCards = useMemo(() => {
    if (!activeSprint) return [];
    return kanban.filter((k) => k.sprintId === activeSprint.id && filterCard(k));
  }, [kanban, activeSprint, selectedProject, selectedType, filterUrgentOnly, searchFilter]);

  // Active Sprint Stats
  const activeSprintStats = useMemo(() => {
    if (!activeSprint) {
      return { totalCards: 0, completedCards: 0, totalPts: 0, completedPts: 0, percent: 0, daysLeft: 0, targetVelocity: 35 };
    }
    const allInSprint = kanban.filter((k) => k.sprintId === activeSprint.id);
    const totalCards = allInSprint.length;
    const completedCards = allInSprint.filter((k) => k.stage === 'done').length;
    const totalPts = allInSprint.reduce((acc, c) => acc + (c.storyPoints || 1), 0);
    const completedPts = allInSprint
      .filter((k) => k.stage === 'done')
      .reduce((acc, c) => acc + (c.storyPoints || 1), 0);
    const percent = totalPts > 0 ? Math.round((completedPts / totalPts) * 100) : 0;

    const endDate = new Date(activeSprint.endDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    return { totalCards, completedCards, totalPts, completedPts, percent, daysLeft, targetVelocity: Math.max(35, totalPts) };
  }, [kanban, activeSprint]);

  // Backlog cards
  const backlogCards = useMemo(() => {
    return kanban.filter((k) => !k.sprintId && filterCard(k));
  }, [kanban, selectedProject, selectedType, filterUrgentOnly, searchFilter]);

  // Card click: opens Issue Detail Modal
  const handleCardClick = (card: KanbanMilestone) => {
    setSelectedDetailMilestone(card);
    setIsDetailModalOpen(true);
  };

  // 1-Click Backlog Promotion: moves issue to active sprint (or first planned sprint)
  const handlePromoteToSprint = (card: KanbanMilestone) => {
    const targetSprint = activeSprint || sprints.find((s) => s.status === 'planned');
    if (targetSprint) {
      saveKanban({ ...card, sprintId: targetSprint.id }, true);
    } else {
      setIsSprintModalOpen(true);
    }
  };

  // 1-Click Demote: moves issue back to backlog pool
  const handleDemoteToBacklog = (card: KanbanMilestone) => {
    saveKanban({ ...card, sprintId: undefined }, true);
  };

  // Quick Backlog Item Form
  const handleAddBacklogItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBacklogTitle.trim()) return;

    const newKeyNum = 100 + kanban.length + 1;
    const newCard: KanbanMilestone = {
      id: 'k_' + Date.now().toString(36),
      issueKey: `SPR-${newKeyNum}`,
      title: quickBacklogTitle.trim(),
      stage: 'todo',
      project: selectedProject !== 'all' ? selectedProject : 'Core Deliverables',
      targetWeek: 'Backlog',
      priority: isUrgentDraft ? 'urgent' : 'medium',
      issueType: isUrgentDraft ? 'code' : 'writing',
      storyPoints: quickBacklogPoints,
    };

    saveKanban(newCard);
    setQuickBacklogTitle('');
    setIsUrgentDraft(false);
  };

  // Drag and Drop
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

  return (
    <div className="space-y-3 font-sans text-xs text-slate-800 dark:text-slate-200">
      
      {/* ======================================================== */}
      {/* TOP STAT PULSE STRIP                                     */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 tracking-wider">
              PLANNING SYNCED
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            v3.4.1
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col">
            <span className="font-mono text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
              TOTAL ISSUES
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {overallStats.totalIssues}
              </span>
              <span className="font-mono text-[10px] text-slate-400">items</span>
            </div>
          </div>

          <div className="flex flex-col border-l border-slate-100 dark:border-slate-800 pl-3">
            <span className="font-mono text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
              TOTAL EFFORT
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {overallStats.totalEffort}
              </span>
              <span className="font-mono text-[10px] text-slate-400">pts</span>
            </div>
          </div>

          <div className="flex flex-col border-l border-slate-100 dark:border-slate-800 pl-3">
            <span className="font-mono text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
              AVG VELOCITY
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400">
                {overallStats.avgVelocity}
              </span>
              <span className="font-mono text-[10px] text-slate-400">pts/s</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SEARCH & TACTICAL QUICK-FILTER BAR                       */}
      {/* ======================================================== */}
      <div className="space-y-2">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter backlog (keys, labels, title)..."
            className="w-full h-8 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs pl-8 pr-12 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all shadow-2xs"
          />
          <div className="absolute right-2 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 font-mono text-[9px] pointer-events-none">
            ⌘K
          </div>
        </div>

        {/* Filter Chips Scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {/* View Tab Switcher */}
          <button
            onClick={() => setActiveViewTab('active_sprint')}
            className={`shrink-0 h-7 px-3 rounded-full font-semibold transition-transform active:scale-95 flex items-center gap-1 shadow-2xs ${
              activeViewTab === 'active_sprint'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Target className="w-3 h-3" />
            <span>Active Sprint</span>
            {activeSprintCards.length > 0 && (
              <span className="font-mono text-[10px] opacity-70">({activeSprintCards.length})</span>
            )}
          </button>

          <button
            onClick={() => setActiveViewTab('backlog')}
            className={`shrink-0 h-7 px-3 rounded-full font-semibold transition-transform active:scale-95 flex items-center gap-1 shadow-2xs ${
              activeViewTab === 'backlog'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Backlog</span>
            <span className="font-mono text-[10px] opacity-70">({backlogCards.length})</span>
          </button>

          <button
            onClick={() => setActiveViewTab('analytics')}
            className={`shrink-0 h-7 px-3 rounded-full font-semibold transition-transform active:scale-95 flex items-center gap-1 shadow-2xs ${
              activeViewTab === 'analytics'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            <span>Velocity</span>
          </button>

          {/* Quick Filter: Urgent P0 */}
          <button
            onClick={() => setFilterUrgentOnly(!filterUrgentOnly)}
            className={`shrink-0 h-7 px-2.5 rounded-full border transition-all flex items-center gap-1 shadow-2xs ${
              filterUrgentOnly
                ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 font-bold'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Twemoji emoji="🚨" className="w-3 h-3 inline-block" />
            <span>Urgent P0</span>
          </button>

          {/* Project Filter */}
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="shrink-0 h-7 px-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs focus:outline-none"
          >
            <option value="all">Epics: All</option>
            {projectList.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Deliverable Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="shrink-0 h-7 px-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs focus:outline-none"
          >
            <option value="all">Type: All</option>
            <option value="experiment">🧪 Exp</option>
            <option value="writing">📝 Draft</option>
            <option value="reading">📖 Paper</option>
            <option value="code">💻 Dev</option>
            <option value="coursework">📚 Course</option>
          </select>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. ACTIVE SPRINT BOARD VIEW                              */}
      {/* ======================================================== */}
      {activeViewTab === 'active_sprint' && (
        <div className="space-y-3">
          
          {/* Sprint Hero Banner & Velocity Summary */}
          {activeSprint ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 rounded-xl flex flex-col gap-2.5 shadow-2xs relative overflow-hidden">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      Active Sprint
                    </span>
                  </div>
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate mt-0.5">
                    {activeSprint.name}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>
                      {activeSprint.startDate} – {activeSprint.endDate}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono text-[11px]">
                      {activeSprintStats.daysLeft} days remaining
                    </span>
                  </p>
                </div>

                {/* Quick Sprint Health Badge */}
                <div className="flex flex-col items-end shrink-0 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 px-2.5 py-1.5 rounded-lg">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {activeSprintStats.percent}%
                    </span>
                    <span className="font-mono text-[9px] text-slate-400 font-medium">BURN</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                    {activeSprintStats.completedPts}/{activeSprintStats.totalPts} pts
                  </span>
                </div>
              </div>

              {/* Segmented Velocity Progress Track */}
              <div className="flex flex-col gap-1 mt-0.5">
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${activeSprintStats.percent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center font-mono text-[10px] text-slate-500 dark:text-slate-400">
                  <span>Target Velocity: {activeSprintStats.targetVelocity} SP</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> On Track
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-2">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                No active sprint running right now
              </p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setActiveViewTab('backlog')}
                  className="px-3 py-1 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg text-xs font-semibold"
                >
                  Plan & Start Sprint
                </button>
              </div>
            </div>
          )}

          {/* Column Selector / Swimlane Tabs */}
          <div className="grid grid-cols-4 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl gap-1 border border-slate-200/80 dark:border-slate-700/80">
            {AGILE_COLUMNS.map((col) => {
              const cardsInCol = activeSprintCards.filter((c) => c.stage === col.id);
              const colPts = cardsInCol.reduce((acc, c) => acc + (c.storyPoints || 1), 0);
              const isSelected = activeSwimlane === col.id;

              return (
                <button
                  key={col.id}
                  onClick={() => setActiveSwimlane(activeSwimlane === col.id ? 'all' : (col.id as SwimlaneLane))}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${col.colorDot}`}></span>
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-wide truncate">
                      {col.title.slice(0, 7)}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 mt-0.5">
                    {cardsInCol.length} <span className="opacity-60">/ {colPts}p</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Kanban Columns Grid / Active Swimlane */}
          <div
            className={`grid gap-2.5 sm:gap-3 items-start ${
              activeSwimlane === 'all'
                ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
                : 'grid-cols-1'
            }`}
          >
            {AGILE_COLUMNS.filter((col) => activeSwimlane === 'all' || activeSwimlane === col.id).map(
              (col) => {
                const cards = activeSprintCards.filter((c) => c.stage === col.id);
                const colPoints = cards.reduce((acc, c) => acc + (c.storyPoints || 1), 0);

                return (
                  <div
                    key={col.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, col.id)}
                    className="bg-slate-50/80 dark:bg-slate-900/40 rounded-xl border border-slate-200/80 dark:border-slate-800 p-2 sm:p-2.5 space-y-2 transition-colors min-h-[160px]"
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${col.colorDot}`}></span>
                        <span className="text-[11px] uppercase tracking-wider text-slate-900 dark:text-white font-bold">
                          {col.title}
                        </span>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] px-1.5 py-0.2 rounded font-semibold border border-slate-200 dark:border-slate-700">
                          {cards.length}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">{colPoints} pts</span>
                    </div>

                    {/* Column Cards */}
                    <div className="space-y-2">
                      {cards.length === 0 ? (
                        <div className="h-20 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-[10px] text-slate-400 select-none">
                          No issues in this lane
                        </div>
                      ) : (
                        cards.map((card) => {
                          const keyTag = card.issueKey || `SPR-${card.id.slice(0, 4).toUpperCase()}`;
                          const isClosed = col.id === 'done';
                          const subtasks = card.subtasks || [];
                          const completedSubs = subtasks.filter((s) => s.completed).length;
                          const issueMeta = ISSUE_TYPE_META[card.issueType || 'experiment'];

                          return (
                            <article
                              key={card.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, card.id)}
                              onClick={() => handleCardClick(card)}
                              className={`border hover:border-slate-300 dark:hover:border-slate-600 transition-all p-3 rounded-xl shadow-2xs flex flex-col gap-2 relative active:scale-[0.99] cursor-pointer ${
                                isClosed
                                  ? 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800 opacity-85'
                                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                              }`}
                            >
                              {/* Top card row: Monospace key badge + tag + priority icon */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                      isClosed
                                        ? 'text-slate-400 line-through bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                                        : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                                    }`}
                                  >
                                    {keyTag}
                                  </span>

                                  {isClosed ? (
                                    <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800 text-[9px] px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5 font-semibold">
                                      <Check className="w-2.5 h-2.5" /> Closed
                                    </span>
                                  ) : (
                                    <span className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase truncate">
                                      #{card.project}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {card.priority === 'urgent' && (
                                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                  )}
                                  {isClosed ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <span
                                      className={`text-[10px] font-bold ${
                                        card.priority === 'urgent'
                                          ? 'text-rose-500'
                                          : card.priority === 'high'
                                          ? 'text-amber-500'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      {card.priority === 'urgent' ? 'P0' : card.priority === 'high' ? 'P1' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Card Title */}
                              <p
                                className={`text-xs font-semibold leading-snug ${
                                  isClosed
                                    ? 'text-slate-400 dark:text-slate-500 line-through'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {renderWithTwemoji(card.title, 'w-3 h-3 inline-block')}
                              </p>

                              {/* Card Footer: Deliverable Type, Target Week, Subtasks, Points */}
                              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[10px]">
                                <div className="flex items-center gap-2">
                                  {issueMeta && (
                                    <span className="flex items-center gap-1 font-mono text-[9px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-1.5 py-0.2 rounded border border-slate-200/60 dark:border-slate-700/60">
                                      <Twemoji emoji={issueMeta.emoji} className="w-3 h-3 inline-block" />
                                      <span>{issueMeta.label}</span>
                                    </span>
                                  )}

                                  <span className="font-mono text-[9px] text-slate-400">
                                    {card.targetWeek || 'W1'}
                                  </span>

                                  {subtasks.length > 0 && (
                                    <div className="flex items-center gap-0.5 text-slate-500 dark:text-slate-400 font-mono text-[9px]">
                                      <CheckSquare className="w-2.5 h-2.5 text-emerald-500" />
                                      <span>
                                        {completedSubs}/{subtasks.length}
                                      </span>
                                    </div>
                                  )}

                                  {(card.comments && card.comments.length > 0) && (
                                    <div className="flex items-center gap-0.5 text-slate-400 font-mono text-[9px]">
                                      <MessageSquare className="w-2.5 h-2.5" />
                                      <span>{card.comments.length}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {isClosed && card.completedNote && (
                                    <span className="text-emerald-600 font-mono text-[9px]">
                                      {card.completedNote}
                                    </span>
                                  )}
                                  <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px] px-1.5 py-0.2 rounded-full font-medium">
                                    {card.storyPoints || 1} pts
                                  </span>
                                </div>
                              </div>
                            </article>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. BACKLOG & PLANNING VIEW                               */}
      {/* ======================================================== */}
      {activeViewTab === 'backlog' && (
        <div className="space-y-4">
          
          {/* SECTION 1: Upcoming / Active Sprint Planning Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                <span>Sprint Planning & Capacity</span>
              </span>
              <button
                onClick={() => {
                  setEditingSprint(null);
                  setIsSprintModalOpen(true);
                }}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                + Create Sprint
              </button>
            </div>

            {sprints.map((sp) => {
              const sprintIssues = kanban.filter((k) => k.sprintId === sp.id);
              const sprintPts = sprintIssues.reduce((acc, c) => acc + (c.storyPoints || 1), 0);
              const targetCapacity = 35;
              const loadPercent = Math.min(100, Math.round((sprintPts / targetCapacity) * 100));
              const headroom = Math.max(0, targetCapacity - sprintPts);

              return (
                <div
                  key={sp.id}
                  className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          {sp.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded border text-[9px] font-bold uppercase ${
                            sp.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {sp.status === 'active' ? 'ACTIVE' : 'PLANNING'}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1 truncate">
                        {sp.goal || 'Core Deliverables & Milestones'}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        {sp.startDate} — {sp.endDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {sp.status === 'planned' && (
                        <button
                          onClick={() => startSprint(sp.id)}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-semibold shadow-2xs active:scale-95 transition-all hover:bg-slate-800"
                        >
                          <Play className="w-3 h-3" />
                          <span>Start Sprint</span>
                        </button>
                      )}
                      {sp.status === 'active' && (
                        <button
                          onClick={() => {
                            setSprintToComplete(sp);
                            setIsCompleteModalOpen(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow-2xs active:scale-95 transition-all hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Complete Sprint</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingSprint(sp);
                          setIsSprintModalOpen(true);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Multi-segment Capacity Meter with Delight Tooltip/State */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-900 dark:text-white font-semibold">
                          {sprintPts} / {targetCapacity} SP
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          ({loadPercent}% Target Load)
                        </span>
                      </div>
                      <span className="text-slate-400 text-[10px]">
                        {headroom} pts headroom
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex border border-slate-200/60 dark:border-slate-700/60">
                      <div
                        className="h-full bg-slate-900 dark:bg-slate-100 transition-all duration-300"
                        style={{ width: `${Math.min(100, (sprintPts / targetCapacity) * 80)}%` }}
                      ></div>
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${Math.min(20, (sprintPts / targetCapacity) * 20)}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-slate-100 inline-block"></span>
                        Committed ({Math.round(sprintPts * 0.7)})
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                        Added ({Math.round(sprintPts * 0.3)})
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block"></span>
                        Buffer ({headroom})
                      </span>
                    </div>
                  </div>

                  {/* Issues assigned to this sprint */}
                  <div className="space-y-1.5 pt-1">
                    {sprintIssues.length === 0 ? (
                      <div className="p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                        No issues assigned yet. Click the upward arrow on backlog items below to promote them.
                      </div>
                    ) : (
                      sprintIssues.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleCardClick(item)}
                          className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2.5 border border-slate-200/70 dark:border-slate-700/70 shadow-2xs hover:border-slate-300 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 rounded font-semibold shrink-0">
                              {item.issueKey || `SPR-${item.id.slice(0, 4).toUpperCase()}`}
                            </span>
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                              {renderWithTwemoji(item.title, 'w-3 h-3 inline-block')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDemoteToBacklog(item);
                              }}
                              className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-mono text-[10px] text-slate-600 dark:text-slate-300 transition-colors"
                              title="Move back to Backlog"
                            >
                              <ArrowLeft className="w-3 h-3" />
                            </button>
                            <span className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-mono text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                              {item.storyPoints || 1}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* SECTION 2: Product Backlog Pool */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Inbox className="w-4 h-4 text-slate-500" />
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Product Backlog
                </h2>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-semibold">
                  {backlogCards.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsCardModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 shadow-2xs hover:border-slate-300 cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-slate-500" />
                  <span>Issue</span>
                </button>
              </div>
            </div>

            {/* Quick Backlog Add Form */}
            <form onSubmit={handleAddBacklogItem} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={quickBacklogTitle}
                  onChange={(e) => setQuickBacklogTitle(e.target.value)}
                  placeholder="Draft deliverable: e.g. Baseline benchmark evaluation..."
                  className="flex-1 h-8 px-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setIsUrgentDraft(!isUrgentDraft)}
                  className={`px-2 h-8 rounded-lg border text-xs font-bold transition-colors flex items-center gap-1 ${
                    isUrgentDraft
                      ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  <Twemoji emoji="🚨" className="w-3 h-3 inline-block" />
                  <span>P0 Bug</span>
                </button>
                <select
                  value={quickBacklogPoints}
                  onChange={(e) => setQuickBacklogPoints(Number(e.target.value))}
                  className="h-8 px-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300"
                >
                  <option value={1}>1 pt</option>
                  <option value={2}>2 pts</option>
                  <option value={3}>3 pts</option>
                  <option value={5}>5 pts</option>
                  <option value={8}>8 pts</option>
                  <option value={13}>13 pts</option>
                </select>
                <button
                  type="submit"
                  disabled={!quickBacklogTitle.trim()}
                  className="px-3 h-8 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold disabled:opacity-40 shadow-2xs"
                >
                  Add
                </button>
              </div>
            </form>

            {/* Backlog Items Stack */}
            <div className="flex flex-col gap-1.5">
              {backlogCards.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                  Backlog is clean! No unassigned items.
                </div>
              ) : (
                backlogCards.map((card) => {
                  const keyTag = card.issueKey || `SPR-${card.id.slice(0, 4).toUpperCase()}`;
                  const isUrgent = card.priority === 'urgent';
                  const issueMeta = ISSUE_TYPE_META[card.issueType || 'experiment'];

                  return (
                    <div
                      key={card.id}
                      onClick={() => handleCardClick(card)}
                      className={`rounded-xl p-2.5 sm:p-3 border shadow-2xs active:bg-slate-50 dark:active:bg-slate-800 transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                        isUrgent
                          ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isUrgent ? (
                          <Twemoji emoji="🚨" className="w-4 h-4 shrink-0 inline-block" />
                        ) : (
                          <Twemoji emoji={issueMeta?.emoji || '📋'} className="w-3.5 h-3.5 shrink-0 inline-block" />
                        )}

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                isUrgent
                                  ? 'text-rose-700 dark:text-rose-300 font-bold'
                                  : 'text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {keyTag}
                            </span>
                            {isUrgent ? (
                              <span className="px-1.5 py-0.2 rounded bg-rose-100 border border-rose-200 dark:bg-rose-900 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-[9px] font-bold">
                                URGENT P0
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-medium truncate max-w-[120px]">
                                #{card.project}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                            {renderWithTwemoji(card.title, 'w-3 h-3 inline-block')}
                          </span>
                        </div>
                      </div>

                      {/* 1-Click Promote Button & Points Badge */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePromoteToSprint(card);
                          }}
                          className={`w-7 h-7 rounded-md border flex items-center justify-center transition-colors active:scale-95 ${
                            isUrgent
                              ? 'bg-rose-100 hover:bg-rose-200 border-rose-200 text-rose-800'
                              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                          title="Move directly to active sprint"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        <span
                          className={`w-7 h-7 rounded-md border flex items-center justify-center font-mono text-[10px] font-bold ${
                            isUrgent
                              ? 'bg-rose-100 border-rose-200 text-rose-700'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {card.storyPoints || 1}
                        </span>
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
      {/* 3. VELOCITY & SPRINT RETROSPECTIVES                      */}
      {/* ======================================================== */}
      {activeViewTab === 'analytics' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-0.5 shadow-2xs">
              <span className="font-mono text-[9px] text-slate-400 uppercase tracking-wider">
                COMPLETED SPRINTS
              </span>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {sprints.filter((s) => s.status === 'completed').length}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-0.5 shadow-2xs">
              <span className="font-mono text-[9px] text-slate-400 uppercase tracking-wider">
                TOTAL EFFORT DELIVERED
              </span>
              <div className="text-base font-bold text-blue-600 dark:text-blue-400">
                {sprints
                  .filter((s) => s.status === 'completed')
                  .reduce((acc, s) => acc + (s.velocityPoints || 0), 0)}{' '}
                <span className="font-mono text-[10px] font-normal text-slate-400">pts</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-0.5 shadow-2xs">
              <span className="font-mono text-[9px] text-slate-400 uppercase tracking-wider">
                AVG VELOCITY
              </span>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {overallStats.avgVelocity}{' '}
                <span className="font-mono text-[10px] font-normal text-slate-400">pts/s</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <h3 className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Sprint History & Retrospectives
            </h3>

            {sprints.filter((s) => s.status === 'completed').length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                No completed sprints yet. Completed sprint metrics and retrospect notes will appear here.
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
                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {sp.name}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              ({sp.startDate} – {sp.endDate})
                            </span>
                          </div>

                          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {sp.velocityPoints || 0} pts ({finishedCards.length} issues)
                          </span>
                        </div>

                        {sp.retrospective && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Retro:</span>{' '}
                            {sp.retrospective}
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

      {/* Floating Action Button (FAB) + New Issue */}
      <aside className="fixed right-4 bottom-20 z-30 sm:hidden">
        <button
          onClick={() => {
            setEditingMilestone(null);
            setCardModalSprintId(activeSprint?.id);
            setIsCardModalOpen(true);
          }}
          className="h-9 px-3.5 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xl flex items-center gap-1.5 font-bold text-xs active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Issue</span>
        </button>
      </aside>

      {/* Modals */}
      <IssueDetailModal
        ws={ws}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedDetailMilestone(null);
        }}
        milestone={selectedDetailMilestone}
        onOpenEditModal={(m) => {
          setIsDetailModalOpen(false);
          setEditingMilestone(m);
          setIsCardModalOpen(true);
        }}
      />

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
