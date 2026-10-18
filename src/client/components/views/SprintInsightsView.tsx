import React, { useState, useMemo, useEffect } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import {
  Sprint,
  KanbanMilestone,
  KanbanIssueType,
} from '../../../types';
import { Twemoji } from '../common/Twemoji';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Calendar,
  Layers,
  ChevronDown,
  ChevronRight,
  UnfoldVertical,
  Activity,
  Award,
  Zap,
  Search,
  Filter,
  FileDown,
  Lock,
  Archive,
  RotateCcw,
  Trash2,
  Bookmark,
  Check,
  History,
  Inbox,
} from 'lucide-react';

interface SprintInsightsViewProps {
  ws: ReturnType<typeof useWorkspace>;
  initialViewMode?: 'burndown' | 'history';
  onCardClick?: (card: KanbanMilestone) => void;
  onEditSprint?: (sprint: Sprint) => void;
}

const TYPE_COLORS: Record<KanbanIssueType, { bg: string; dot: string; label: string; emoji: string }> = {
  experiment: { bg: 'bg-blue-600', dot: '#2563eb', label: 'Experiments', emoji: '🧪' },
  writing: { bg: 'bg-amber-500', dot: '#f59e0b', label: 'Paper Drafts', emoji: '📝' },
  reading: { bg: 'bg-purple-600', dot: '#9333ea', label: 'Paper Reading', emoji: '📖' },
  code: { bg: 'bg-emerald-500', dot: '#10b981', label: 'Dev & Implementation', emoji: '💻' },
  coursework: { bg: 'bg-teal-500', dot: '#14b8a6', label: 'Coursework', emoji: '📚' },
};

// Default sample completed sprint history if fresh database
const SAMPLE_COMPLETED_SPRINTS = [
  {
    id: 'sp_hist_33',
    name: 'Sprint 33: Core Data & Sync',
    completedDate: 'Completed Oct 14, 2026 • 2 Weeks',
    goal: 'Shipped optimistic local cache layer, delta compaction routines, and distributed conflict resolver.',
    donePts: 36,
    totalPts: 36,
    issuesCount: 14,
    rolloverCount: 0,
    shipRate: '100% Shipped',
    highlights: [
      { issueKey: 'SPR-92', title: 'Optimistic cache read-through driver' },
      { issueKey: 'SPR-95', title: 'WebSocket reconnection jitter strategy' },
    ],
  },
  {
    id: 'sp_hist_32',
    name: 'Sprint 32: Auth PKCE & Hardening',
    completedDate: 'Completed Sep 30, 2026 • 2 Weeks',
    goal: 'Upgrade biometric enclave authentication handlers and rotate asymmetric signing tokens.',
    donePts: 34,
    totalPts: 37,
    issuesCount: 12,
    rolloverCount: 1,
    shipRate: '92% Achieved',
    highlights: [
      { issueKey: 'SPR-81', title: 'Secure Enclave Biometric Attestation' },
      { issueKey: 'SPR-83', title: 'OAuth2 PKCE verifier state machine' },
    ],
  },
  {
    id: 'sp_hist_31',
    name: 'Sprint 31: Push Dispatcher',
    completedDate: 'Completed Sep 16, 2026 • 2 Weeks',
    goal: 'APNS payload multiplexing with foreground notification deduplication and backoff throttle.',
    donePts: 30,
    totalPts: 30,
    issuesCount: 10,
    rolloverCount: 0,
    shipRate: '100% Shipped',
    highlights: [
      { issueKey: 'SPR-74', title: 'APNS payload multiplexer router' },
      { issueKey: 'SPR-76', title: 'Notification throttle sliding window' },
    ],
  },
];

export const SprintInsightsView: React.FC<SprintInsightsViewProps> = ({
  ws,
  initialViewMode = 'burndown',
  onCardClick,
  onEditSprint,
}) => {
  const { sprints, kanban, restoreKanban, deleteKanban, viewedSemester } = ws;

  // View Mode: driven directly by the top pill tab ('burndown' vs 'history')
  const viewMode = initialViewMode;

  // History Sub-navigation: 'completed' | 'archived' | 'milestones'
  const [historyTab, setHistoryTab] = useState<'completed' | 'archived' | 'milestones'>('completed');
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterTag, setHistoryFilterTag] = useState('all');

  // Active sprint default, or first available sprint
  const activeSprint = useMemo(() => {
    return sprints.find((s) => s.status === 'active') || sprints[0] || null;
  }, [sprints]);

  const [selectedSprintId, setSelectedSprintId] = useState<string>(activeSprint?.id || '');
  const [showSprintMenu, setShowSprintMenu] = useState(false);

  // Fallback to active sprint if selected id not in list
  const currentSprint = useMemo(() => {
    return sprints.find((s) => s.id === selectedSprintId) || activeSprint;
  }, [sprints, selectedSprintId, activeSprint]);

  // Persisted cheer/kudos count per sprint
  const kudosStorageKey = currentSprint ? `aw_sprint_kudos_${currentSprint.id}` : 'aw_sprint_kudos_default';
  const [clapCount, setClapCount] = useState<number>(() => {
    try {
      const val = localStorage.getItem(kudosStorageKey);
      return val ? Number(val) : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    if (!currentSprint) return;
    try {
      const val = localStorage.getItem(`aw_sprint_kudos_${currentSprint.id}`);
      setClapCount(val ? Number(val) : 0);
    } catch {
      setClapCount(0);
    }
  }, [currentSprint]);

  const handleClap = () => {
    const next = clapCount + 1;
    setClapCount(next);
    try {
      localStorage.setItem(kudosStorageKey, String(next));
    } catch {}
  };

  // Sprint metrics calculation from real DB records for Burndown tab
  const metrics = useMemo(() => {
    if (!currentSprint) {
      return {
        totalPts: 0,
        completedPts: 0,
        remainingPts: 0,
        burnPercent: 0,
        daysTotal: 14,
        dayCurrent: 1,
        daysLeft: 14,
        blockersCount: 0,
        blockedPts: 0,
        healthPercent: 100,
        scopeChangePts: 0,
        scopeChangeCount: 0,
        issues: [],
        completedIssues: [],
        remainingIssues: [],
        inProgressIssues: [],
        typeDistribution: [],
        projectDistribution: [],
        dailyBurnRate: 0,
        daysNeeded: 0,
        predictionText: 'Planned',
        confidenceScore: 100,
      };
    }

    const issues = kanban.filter((k) => k.sprintId === currentSprint.id);
    const completedIssues = issues.filter((k) => k.stage === 'done');
    const remainingIssues = issues.filter((k) => k.stage !== 'done');
    const inProgressIssues = issues.filter((k) => k.stage === 'in_progress' || k.stage === 'review' || k.stage === 'experiments');

    const totalPts = issues.reduce((acc, c) => acc + (c.storyPoints || 1), 0);
    const completedPts = completedIssues.reduce((acc, c) => acc + (c.storyPoints || 1), 0);
    const remainingPts = totalPts - completedPts;
    const burnPercent = totalPts > 0 ? Math.round((completedPts / totalPts) * 100) : 0;

    const startDate = new Date(currentSprint.startDate);
    const endDate = new Date(currentSprint.endDate);
    const today = new Date();

    const daysTotal = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const dayCurrent = Math.max(1, Math.min(daysTotal, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))));
    const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    const blockers = issues.filter((k) => k.isBlocked);
    const blockersCount = blockers.length;
    const blockedPts = blockers.reduce((acc, c) => acc + (c.storyPoints || 1), 0);

    const healthPercent = Math.max(0, Math.min(100, 100 - (blockersCount * 15)));

    const dailyBurnRate = dayCurrent > 0 ? parseFloat((completedPts / dayCurrent).toFixed(1)) : 0;
    const daysNeeded = dailyBurnRate > 0 ? Math.ceil(remainingPts / dailyBurnRate) : daysLeft + 5;

    let predictionText = 'On Track';
    let confidenceScore = 92;
    if (burnPercent === 100) {
      predictionText = 'Completed';
      confidenceScore = 100;
    } else if (blockersCount > 1 || (daysNeeded > daysLeft && daysLeft > 0)) {
      predictionText = 'At Risk';
      confidenceScore = 65;
    } else if (burnPercent >= 60) {
      predictionText = 'Ahead of Pace';
      confidenceScore = 96;
    }

    return {
      totalPts,
      completedPts,
      remainingPts,
      burnPercent,
      daysTotal,
      dayCurrent,
      daysLeft,
      blockersCount,
      blockedPts,
      healthPercent,
      scopeChangePts: 0,
      scopeChangeCount: 0,
      issues,
      completedIssues,
      remainingIssues,
      inProgressIssues,
      typeDistribution: [],
      projectDistribution: [],
      dailyBurnRate,
      daysNeeded,
      predictionText,
      confidenceScore,
    };
  }, [currentSprint, kanban]);

  // Burndown SVG projection calculation
  const burndownData = useMemo(() => {
    const { totalPts, completedPts, remainingPts, daysTotal, dayCurrent, daysLeft, dailyBurnRate } = metrics;
    const maxPts = Math.max(totalPts, 10);
    const xMin = 28;
    const xMax = 328;
    const yTop = 20;
    const yBottom = 140;

    const todayFraction = daysTotal > 0 ? Math.min(1, dayCurrent / daysTotal) : 0.5;
    const todayX = Math.round(xMin + todayFraction * (xMax - xMin));
    const todayY = Math.round(yBottom - (remainingPts / maxPts) * (yBottom - yTop));

    const stepCount = Math.max(2, Math.min(daysTotal, dayCurrent));
    const actualPoints: [number, number][] = [];
    actualPoints.push([xMin, yTop]);

    for (let i = 1; i < stepCount; i++) {
      const frac = i / stepCount;
      const x = Math.round(xMin + frac * (todayX - xMin));
      const ptsLeftAtStep = totalPts - (frac * completedPts);
      const y = Math.round(yBottom - (Math.max(0, ptsLeftAtStep) / maxPts) * (yBottom - yTop));
      actualPoints.push([x, y]);
    }
    actualPoints.push([todayX, todayY]);

    const actualPathStr = actualPoints.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`).join(' ');
    const actualAreaStr = `${actualPathStr} L ${todayX} ${yBottom} L ${xMin} ${yBottom} Z`;

    const expectedRemainingAtEnd = Math.max(0, remainingPts - Math.round(dailyBurnRate * daysLeft));
    const projectedEndY = Math.round(yBottom - (expectedRemainingAtEnd / maxPts) * (yBottom - yTop));

    const optimisticRemaining = Math.max(0, remainingPts - Math.round(dailyBurnRate * 1.3 * daysLeft));
    const optimisticEndY = Math.round(yBottom - (optimisticRemaining / maxPts) * (yBottom - yTop));

    const conservativeRemaining = Math.max(0, remainingPts - Math.round(dailyBurnRate * 0.7 * daysLeft));
    const conservativeEndY = Math.round(yBottom - (conservativeRemaining / maxPts) * (yBottom - yTop));

    const conePointsStr = `${todayX},${todayY} ${xMax},${optimisticEndY} ${xMax},${conservativeEndY} ${todayX},${todayY}`;

    return {
      maxPts,
      xMin,
      xMax,
      yTop,
      yBottom,
      todayX,
      todayY,
      actualPathStr,
      actualAreaStr,
      projectedEndY,
      conePointsStr,
    };
  }, [metrics]);

  // History & Cold Storage data
  const completedSprintsList = useMemo(() => {
    const realCompleted = sprints.filter((s) => s.status === 'completed');
    if (realCompleted.length > 0) {
      return realCompleted.map((s) => {
        const issues = kanban.filter((k) => k.sprintId === s.id);
        const done = issues.filter((k) => k.stage === 'done');
        const donePts = done.reduce((acc, c) => acc + (c.storyPoints || 1), 0);
        const totalPts = issues.reduce((acc, c) => acc + (c.storyPoints || 1), 0);
        const rolloverCount = issues.length - done.length;
        const pct = totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 100;

        const highlights = (s.shippedHighlights && s.shippedHighlights.length > 0)
          ? s.shippedHighlights
          : done.slice(0, 2).map((k) => ({
              issueKey: k.issueKey || `SPR-${k.id.slice(0, 4)}`,
              title: k.title,
            }));

        return {
          id: s.id,
          name: s.name,
          completedDate: `Completed ${s.endDate} • 2 Weeks`,
          goal: s.goal || 'Sprint deliverables concluded and archived.',
          donePts,
          totalPts,
          issuesCount: issues.length,
          rolloverCount,
          shipRate: `${pct}% Shipped`,
          highlights,
        };
      });
    }
    return SAMPLE_COMPLETED_SPRINTS;
  }, [sprints, kanban]);

  // Cold Storage / Archived Issues
  const archivedIssues = useMemo(() => {
    return kanban.filter((k) => k.isArchived);
  }, [kanban]);

  // Export Full Velocity Audit to CSV
  const handleExportCSV = () => {
    const rows = [
      ['Sprint / Record Name', 'Status', 'Start Date', 'End Date', 'Committed SP', 'Done SP', 'Velocity Pts', 'Goal / Notes'],
      ...sprints.map((s) => {
        const issues = kanban.filter((k) => k.sprintId === s.id);
        const total = issues.reduce((acc, c) => acc + (c.storyPoints || 1), 0);
        const done = issues.filter((k) => k.stage === 'done').reduce((acc, c) => acc + (c.storyPoints || 1), 0);
        return [
          s.name,
          s.status,
          s.startDate,
          s.endDate,
          total,
          done,
          s.velocityPoints || done,
          s.goal || s.retrospective || '',
        ];
      }),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map((cell) => `"${cell}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sprint_velocity_audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3.5 font-sans text-xs text-slate-800 dark:text-slate-200">
      {/* ======================================================== */}
      {/* VIEW MODE 1: ACTIVE BURNDOWN & PREDICTION RADAR          */}
      {/* ======================================================== */}
      {viewMode === 'burndown' && (
        <div className="space-y-3">
          {/* Sprint Switcher Bar */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentSprint ? currentSprint.name : 'Active Sprint'}
                  </span>
                  <span
                    className={`font-mono text-[9px] px-1.5 py-0.2 rounded font-bold uppercase border ${
                      currentSprint?.status === 'active'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {currentSprint?.status || 'Active'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                  {currentSprint?.startDate} – {currentSprint?.endDate} · Day {metrics.dayCurrent} of {metrics.daysTotal}
                </span>
              </div>
            </div>

            {/* Sprint Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSprintMenu(!showSprintMenu)}
                className="h-7 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1 active:bg-slate-100 transition-colors shadow-2xs"
              >
                <span className="truncate max-w-[110px]">{currentSprint?.name || 'Select Sprint'}</span>
                <UnfoldVertical className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {showSprintMenu && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-30 text-xs">
                  {sprints.map((sp) => (
                    <button
                      key={sp.id}
                      onClick={() => {
                        setSelectedSprintId(sp.id);
                        setShowSprintMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between"
                    >
                      <span className="truncate font-semibold">{sp.name}</span>
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {sp.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* KPI Bento Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Burn Progress</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">{metrics.burnPercent}%</span>
                <span className="text-[10px] text-slate-400">done</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {metrics.completedPts} of {metrics.totalPts} SP
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Daily Burn Rate</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono">{metrics.dailyBurnRate}</span>
                <span className="text-[10px] text-slate-400">pts/day</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 mt-1">
                {metrics.daysLeft} days remaining
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sprint Health</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">{metrics.healthPercent}%</span>
                <span className="text-[10px] text-slate-400">score</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 mt-1">
                {metrics.blockersCount} active blockers
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completion Forecast</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 truncate">{metrics.predictionText}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 mt-1">
                {metrics.confidenceScore}% confidence
              </span>
            </div>
          </div>

          {/* SVG Burndown Chart Card */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Burndown Curve & Projection Cone</span>
              <span className="text-[10px] font-mono text-slate-400">Target: {metrics.totalPts} SP</span>
            </div>

            <div className="w-full h-44 overflow-hidden">
              <svg viewBox="0 0 350 160" className="w-full h-full">
                {/* Guidelines */}
                <line x1="28" y1="20" x2="328" y2="20" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                <line x1="28" y1="80" x2="328" y2="80" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                <line x1="28" y1="140" x2="328" y2="140" stroke="currentColor" className="text-slate-300 dark:text-slate-700" strokeWidth="1" />

                {/* Ideal burn diagonal */}
                <line x1="28" y1="20" x2="328" y2="140" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth="1.5" />

                {/* Cone of uncertainty */}
                <polygon points={burndownData.conePointsStr} fill="rgba(59, 130, 246, 0.12)" />

                {/* Actual Area */}
                <path d={burndownData.actualAreaStr} fill="rgba(16, 185, 129, 0.15)" />

                {/* Actual Path */}
                <path d={burndownData.actualPathStr} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Current point */}
                <circle cx={burndownData.todayX} cy={burndownData.todayY} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
              </svg>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Actual Burn</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span>Ideal Pace</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span>Projection Cone</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW MODE 2: SPRINT HISTORY & ARCHIVES (SCREEN 3 DESIGN) */}
      {/* ======================================================== */}
      {viewMode === 'history' && (
        <div className="space-y-3.5">
          {/* Header Context & Title Area */}
          <div className="flex flex-col gap-1 p-1">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="font-bold uppercase tracking-wider text-slate-500">Historical Records</span>
                <span>•</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">Q4 Review</span>
              </div>
              <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                v2.4 Audit
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Sprint History & Archives
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Audit past iterations, retrospectives, and engineering velocity records.
            </p>
          </div>

          {/* Segmented Control Navigation */}
          <div className="flex p-0.5 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl gap-0.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setHistoryTab('completed')}
              className={`flex-1 min-w-[110px] py-1.5 px-2 rounded-lg font-bold text-xs transition-all text-center whitespace-nowrap ${
                historyTab === 'completed'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Completed ({completedSprintsList.length})
            </button>
            <button
              type="button"
              onClick={() => setHistoryTab('archived')}
              className={`flex-1 min-w-[110px] py-1.5 px-2 rounded-lg font-bold text-xs transition-all text-center whitespace-nowrap ${
                historyTab === 'archived'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Archived ({archivedIssues.length})
            </button>
            <button
              type="button"
              onClick={() => setHistoryTab('milestones')}
              className={`flex-1 min-w-[110px] py-1.5 px-2 rounded-lg font-bold text-xs transition-all text-center whitespace-nowrap ${
                historyTab === 'milestones'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Milestones (4)
            </button>
          </div>

          {/* Historical Velocity Aggregate Card with Micro Bar Chart */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Velocity Aggregate</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                +12% vs Q3 baseline
              </span>
            </div>

            {/* 3-Column Metrics Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Velocity</span>
                <span className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                  34.2 <span className="text-[10px] font-normal text-slate-400">SP</span>
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ship Rate</span>
                <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                  94.6%
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Output</span>
                <span className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                  382 <span className="text-[10px] font-normal text-slate-400">SP</span>
                </span>
              </div>
            </div>

            {/* Micro Bar Chart (Last 5 Sprints) */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Delivery Pacing (S29 - S33)</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">Target: 32 SP</span>
              </div>

              <div className="h-16 flex items-end justify-between gap-2 px-1 pt-2">
                {[
                  { id: 'S29', pts: 28, height: 'h-8', isCurrent: false },
                  { id: 'S30', pts: 31, height: 'h-10', isCurrent: false },
                  { id: 'S31', pts: 30, height: 'h-9', isCurrent: false },
                  { id: 'S32', pts: 34, height: 'h-12', isCurrent: false },
                  { id: 'S33', pts: 36, height: 'h-14', isCurrent: true },
                ].map((bar) => (
                  <div key={bar.id} className="flex-1 flex flex-col items-center gap-1 group">
                    <div
                      className={`w-full rounded-t flex items-end justify-center transition-all ${
                        bar.isCurrent
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-blue-500'
                      } ${bar.height}`}
                    >
                      <span className="font-mono text-[9px] font-bold pb-0.5 opacity-90">{bar.pts}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">{bar.id}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="space-y-1.5">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search sprints, epics, or goals..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
              <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                {viewedSemester?.name || '2026-2027 Fall'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Q4 Sprints
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Core Research
              </span>
            </div>
          </div>

          {/* Completed Sprints Archive Feed */}
          {historyTab === 'completed' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  Completed Iterations
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Showing {completedSprintsList.length} sprints
                </span>
              </div>

              {completedSprintsList.map((sp) => (
                <div
                  key={sp.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate">
                          {sp.name}
                        </h4>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                        {sp.completedDate}
                      </span>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">
                      {sp.shipRate}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {sp.goal}
                  </p>

                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold">
                      {sp.donePts} / {sp.totalPts} SP Done
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {sp.issuesCount} Issues
                    </span>
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded-lg ${
                        sp.rolloverCount > 0
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {sp.rolloverCount} Rollover
                    </span>
                  </div>

                  {/* Shipped Highlights Micro Row */}
                  {sp.highlights && sp.highlights.length > 0 && (
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Shipped Key Deliverables:
                      </span>
                      {sp.highlights.map((h) => (
                        <div key={h.issueKey} className="flex items-center gap-1.5 text-[11px]">
                          <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs">
                            {h.issueKey}
                          </span>
                          <span className="truncate text-slate-700 dark:text-slate-300">{h.title}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                    <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <span>View Retrospective & Audit Log</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Cold Storage / Archived Backlog Section */}
          {historyTab === 'archived' && (
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-2.5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Archive className="w-4 h-4 text-slate-400" />
                    <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                      Archived Backlog (Cold Storage)
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Preserved audit tickets without active queue clutter.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {archivedIssues.length} Total
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                {archivedIssues.length === 0 ? (
                  <div className="space-y-1.5">
                    {/* Fallback Sample Cold Storage Item */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                            SPR-84
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            Legacy OAuth1 endpoint retirement
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          Archived from Sprint 32 • 3 SP
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                        Won't Fix
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                            SPR-71
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            Experimental canvas gesture zoom
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          Archived from Sprint 30 • 5 SP
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                        Parked V3
                      </span>
                    </div>
                  </div>
                ) : (
                  archivedIssues.map((card) => (
                    <div
                      key={card.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 group"
                    >
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                            {card.issueKey || `SPR-${card.id.slice(0, 4)}`}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {card.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {card.project} • {card.storyPoints || 1} SP
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold capitalize">
                          {card.archiveReason ? card.archiveReason.replace('_', ' ') : 'Archived'}
                        </span>
                        <button
                          type="button"
                          onClick={() => restoreKanban(card.id)}
                          className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                          title="Restore to Backlog"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteKanban(card.id)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                          title="Permanently Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Milestones view */}
          {historyTab === 'milestones' && (
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Key Semester Milestones
              </span>
              <div className="space-y-1.5 pt-1">
                {[
                  { title: 'Baseline Architecture Prototype', status: 'Completed', date: 'Sep 2026' },
                  { title: 'Conference Submission Draft (Graph-RAG)', status: 'In Review', date: 'Oct 2026' },
                  { title: 'Empirical Benchmark Replication', status: 'In Progress', date: 'Nov 2026' },
                  { title: 'Final Thesis Defense & Package', status: 'Planned', date: 'Dec 2026' },
                ].map((m) => (
                  <div key={m.title} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <h5 className="font-semibold text-xs text-slate-800 dark:text-slate-200">{m.title}</h5>
                      <span className="text-[10px] text-slate-400 font-mono">{m.date}</span>
                    </div>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Export & Utility Action */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleExportCSV}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-bold text-xs rounded-xl shadow-2xs transition-colors"
            >
              <FileDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Export Full Velocity Audit (CSV)</span>
            </button>
            <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[10px] font-mono py-1">
              <Lock className="w-3 h-3" />
              <span>Immutable Git SHA records linked to completed sprint boundaries</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
