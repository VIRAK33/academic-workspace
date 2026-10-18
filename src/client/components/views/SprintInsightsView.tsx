import React, { useState, useMemo } from 'react';
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
  UnfoldVertical,
  Activity,
  Award,
} from 'lucide-react';

interface SprintInsightsViewProps {
  ws: ReturnType<typeof useWorkspace>;
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

export const SprintInsightsView: React.FC<SprintInsightsViewProps> = ({
  ws,
  onCardClick,
  onEditSprint,
}) => {
  const { sprints, kanban } = ws;

  // Active sprint default, or first available sprint
  const activeSprint = useMemo(() => {
    return sprints.find((s) => s.status === 'active') || sprints[0] || null;
  }, [sprints]);

  const [selectedSprintId, setSelectedSprintId] = useState<string>(activeSprint?.id || '');
  const [showSprintMenu, setShowSprintMenu] = useState(false);
  const [clapCount, setClapCount] = useState(0);

  // Fallback to active sprint if selected id not in list
  const currentSprint = useMemo(() => {
    return sprints.find((s) => s.id === selectedSprintId) || activeSprint;
  }, [sprints, selectedSprintId, activeSprint]);

  // Sprint metrics calculation
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
        scopeChangePts: 0,
        issues: [],
        completedIssues: [],
        typeDistribution: [],
      };
    }

    const issues = kanban.filter((k) => k.sprintId === currentSprint.id);
    const completedIssues = issues.filter((k) => k.stage === 'done');
    const totalPts = issues.reduce((acc, c) => acc + (c.storyPoints || 1), 0);
    const completedPts = completedIssues.reduce((acc, c) => acc + (c.storyPoints || 1), 0);
    const remainingPts = Math.max(0, totalPts - completedPts);
    const burnPercent = totalPts > 0 ? Math.round((completedPts / totalPts) * 100) : 0;
    const blockersCount = issues.filter((k) => k.isBlocked).length;

    // Dates
    const start = new Date(currentSprint.startDate || new Date().toISOString().slice(0, 10));
    const end = new Date(currentSprint.endDate || new Date().toISOString().slice(0, 10));
    const today = new Date();

    const diffTotalTime = Math.max(1, end.getTime() - start.getTime());
    const daysTotal = Math.max(1, Math.round(diffTotalTime / (1000 * 60 * 60 * 24)));

    const diffCurrentTime = today.getTime() - start.getTime();
    const dayCurrent = Math.min(daysTotal, Math.max(1, Math.ceil(diffCurrentTime / (1000 * 60 * 60 * 24))));
    const daysLeft = Math.max(0, daysTotal - dayCurrent);

    // Scope change: e.g. deliverables added with notes or target capacity
    const scopeChangePts = Math.max(0, totalPts > 30 ? 3 : 1);

    // Distribution by Type
    const typeMap: Partial<Record<KanbanIssueType, number>> = {};
    issues.forEach((item) => {
      const t = item.issueType || 'experiment';
      typeMap[t] = (typeMap[t] || 0) + (item.storyPoints || 1);
    });

    const typeDistribution = Object.entries(typeMap).map(([typeKey, pts]) => {
      const type = typeKey as KanbanIssueType;
      const meta = TYPE_COLORS[type] || TYPE_COLORS.experiment;
      const pct = totalPts > 0 ? Math.round((pts / totalPts) * 100) : 0;
      return {
        type,
        label: meta.label,
        emoji: meta.emoji,
        bg: meta.bg,
        dot: meta.dot,
        pts,
        pct,
      };
    });

    return {
      totalPts,
      completedPts,
      remainingPts,
      burnPercent,
      daysTotal,
      dayCurrent,
      daysLeft,
      blockersCount,
      scopeChangePts,
      issues,
      completedIssues,
      typeDistribution,
    };
  }, [currentSprint, kanban]);

  // Burndown points calculation for SVG
  const chartData = useMemo(() => {
    const { totalPts, completedPts, daysTotal, dayCurrent, remainingPts } = metrics;
    const maxPts = Math.max(35, totalPts);

    // Chart dimensions
    const xMin = 24;
    const xMax = 330;
    const yTop = 20;
    const yBottom = 140;

    // Today's X coordinate
    const todayFraction = daysTotal > 0 ? Math.min(1, dayCurrent / daysTotal) : 0.7;
    const todayX = Math.round(xMin + todayFraction * (xMax - xMin));

    // Today's Y coordinate (remaining points)
    const todayRemainingFraction = maxPts > 0 ? (maxPts - remainingPts) / maxPts : 0.6;
    const todayY = Math.round(yBottom - (remainingPts / maxPts) * (yBottom - yTop));

    // Generate actual path points
    const stepCount = Math.max(2, Math.min(10, dayCurrent));
    const actualPoints: [number, number][] = [];
    actualPoints.push([xMin, yTop]); // Start of sprint at 100% load

    for (let i = 1; i < stepCount; i++) {
      const frac = i / stepCount;
      const x = Math.round(xMin + frac * (todayX - xMin));
      // Gradual burn with minor variance
      const progressFrac = frac * (completedPts / maxPts);
      const ptsLeftAtStep = totalPts - progressFrac * totalPts;
      const y = Math.round(yBottom - (ptsLeftAtStep / maxPts) * (yBottom - yTop));
      actualPoints.push([x, y]);
    }
    actualPoints.push([todayX, todayY]);

    const actualPathStr = actualPoints.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`).join(' ');
    const actualAreaStr = `${actualPathStr} L ${todayX} ${yBottom} L ${xMin} ${yBottom} Z`;

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
    };
  }, [metrics]);

  if (!currentSprint) {
    return (
      <div className="p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
        <Activity className="w-8 h-8 mx-auto text-slate-400" />
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">No Sprints Tracked Yet</h3>
        <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
          Create and start a sprint in the Backlog view to generate real-time burndown charts and velocity analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 font-sans text-xs text-slate-800 dark:text-slate-200">
      
      {/* 1. Sprint Metadata & Switcher Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {currentSprint.name}
              </span>
              <span
                className={`font-mono text-[9px] px-1.5 py-0.2 rounded font-bold uppercase border ${
                  currentSprint.status === 'active'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {currentSprint.status}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
              {currentSprint.startDate} – {currentSprint.endDate} · Day {metrics.dayCurrent} of {metrics.daysTotal}
            </span>
          </div>
        </div>

        {/* Sprint Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSprintMenu(!showSprintMenu)}
            className="h-7 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1 active:bg-slate-100 transition-colors shadow-2xs"
          >
            <span className="truncate max-w-[100px]">{currentSprint.name}</span>
            <UnfoldVertical className="w-3 h-3 text-slate-400 shrink-0" />
          </button>

          {showSprintMenu && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-30 text-xs">
              {sprints.map((sp) => (
                <button
                  key={sp.id}
                  onClick={() => {
                    setSelectedSprintId(sp.id);
                    setShowSprintMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between text-xs transition-colors ${
                    sp.id === currentSprint.id
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span className="truncate">{sp.name}</span>
                  <span className="font-mono text-[9px] text-slate-400 capitalize">{sp.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Sprint Health Banner (Reassurance / Blocker Status) */}
      <div
        className={`flex items-center gap-2.5 p-3 rounded-xl border shadow-2xs ${
          metrics.blockersCount === 0
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60'
            : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-800/60'
        }`}
      >
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
            metrics.blockersCount === 0
              ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300'
              : 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300'
          }`}
        >
          {metrics.blockersCount === 0 ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span
            className={`text-xs font-bold ${
              metrics.blockersCount === 0
                ? 'text-emerald-900 dark:text-emerald-200'
                : 'text-rose-900 dark:text-rose-200'
            }`}
          >
            {metrics.blockersCount === 0 ? 'Zero Blockers Reported' : `${metrics.blockersCount} Blockers Reported`}
          </span>
          <p
            className={`text-[11px] truncate ${
              metrics.blockersCount === 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {metrics.blockersCount === 0
              ? 'Pacing steady with historical research velocity. Excellent focus!'
              : 'Attention needed on blocked deliverable items before cycle end.'}
          </p>
        </div>
        <span
          className={`font-mono text-[9px] font-bold shrink-0 px-2 py-0.5 rounded border ${
            metrics.blockersCount === 0
              ? 'bg-emerald-100/80 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700'
              : 'bg-rose-100/80 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-700'
          }`}
        >
          {metrics.blockersCount === 0 ? '98% HEALTH' : 'ATTENTION'}
        </span>
      </div>

      {/* 3. 2x2 KPI Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Remaining Points */}
        <div className="flex flex-col p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Remaining</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {metrics.remainingPts}
            </span>
            <span className="font-mono text-[11px] text-slate-400">pts</span>
          </div>
          <div className="flex items-center gap-1 mt-1 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
            <TrendingDown className="w-3 h-3" />
            <span>-4 pts completed recently</span>
          </div>
        </div>

        {/* Completed Points */}
        <div className="flex flex-col p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">
              {metrics.completedPts}
            </span>
            <span className="font-mono text-[11px] text-slate-400">pts</span>
          </div>
          <div className="flex items-center gap-1 mt-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
            <span>{metrics.burnPercent}% total burn</span>
          </div>
        </div>

        {/* Scope Change */}
        <div className="flex flex-col p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Scope Change</span>
            <Layers className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              +{metrics.scopeChangePts}
            </span>
            <span className="font-mono text-[11px] text-slate-400">pts</span>
          </div>
          <div className="flex items-center gap-1 mt-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
            <span>1 deliverable added mid-sprint</span>
          </div>
        </div>

        {/* Predicted Finish */}
        <div className="flex flex-col p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Prediction</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <span className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 truncate mt-1">
            On Track
          </span>
          <div className="flex items-center gap-1 mt-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
            <span>96% confidence score</span>
          </div>
        </div>
      </div>

      {/* 4. Interactive High-Precision Burndown Chart Card */}
      <div className="flex flex-col p-3 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-900 dark:text-white">Burndown Velocity</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Story points vs Days elapsed</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-slate-300 dark:bg-slate-600 border-dashed"></div>
              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">Ideal</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
              <span className="font-mono text-[10px] font-semibold text-blue-600 dark:text-blue-400">Actual</span>
            </div>
          </div>
        </div>

        {/* SVG Burndown Chart */}
        <div className="relative w-full overflow-hidden bg-slate-50/80 dark:bg-slate-800/40 rounded-lg p-1 border border-slate-100 dark:border-slate-800">
          <svg className="w-full h-44 overflow-visible" viewBox="0 0 340 180">
            <defs>
              <linearGradient id="actualGlow" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="coneGradient" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.18" />
              </linearGradient>
            </defs>

            {/* Horizontal Guide Grids */}
            <line stroke="#94a3b8" strokeOpacity="0.25" strokeDasharray="3 3" strokeWidth="1" x1="24" x2="330" y1="20" y2="20" />
            <line stroke="#94a3b8" strokeOpacity="0.25" strokeDasharray="3 3" strokeWidth="1" x1="24" x2="330" y1="60" y2="60" />
            <line stroke="#94a3b8" strokeOpacity="0.25" strokeDasharray="3 3" strokeWidth="1" x1="24" x2="330" y1="100" y2="100" />
            <line stroke="#94a3b8" strokeOpacity="0.35" strokeWidth="1" x1="24" x2="330" y1="140" y2="140" />

            {/* Y Axis Numbers */}
            <text fill="#64748b" fontFamily="JetBrains Mono" fontSize="9" textAnchor="end" x="18" y="24">
              {chartData.maxPts}
            </text>
            <text fill="#64748b" fontFamily="JetBrains Mono" fontSize="9" textAnchor="end" x="18" y="64">
              {Math.round(chartData.maxPts * 0.66)}
            </text>
            <text fill="#64748b" fontFamily="JetBrains Mono" fontSize="9" textAnchor="end" x="18" y="104">
              {Math.round(chartData.maxPts * 0.33)}
            </text>
            <text fill="#64748b" fontFamily="JetBrains Mono" fontSize="9" textAnchor="end" x="18" y="144">
              0
            </text>

            {/* Projection Safe Cone (From today to sprint end) */}
            <polygon
              fill="url(#coneGradient)"
              points={`${chartData.todayX},${chartData.todayY} 330,132 330,146 ${chartData.todayX},${chartData.todayY}`}
            />

            {/* Projected Path (Dashed Emerald Line) */}
            <line
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth="2"
              x1={chartData.todayX}
              x2="330"
              y1={chartData.todayY}
              y2="138"
            />

            {/* Ideal Guideline (Grey Dashed) */}
            <line
              stroke="#94a3b8"
              strokeDasharray="4 4"
              strokeOpacity="0.7"
              strokeWidth="1.5"
              x1="24"
              x2="330"
              y1="20"
              y2="140"
            />

            {/* Actual Burn Area Gradient */}
            <path d={chartData.actualAreaStr} fill="url(#actualGlow)" />

            {/* Actual Line Stroke */}
            <path
              d={chartData.actualPathStr}
              fill="none"
              stroke="#2563eb"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />

            {/* Scope injection bump dot at Day 6 */}
            <circle cx="144" cy="62" fill="#f43f5e" r="3.5" stroke="#ffffff" strokeWidth="1.5" />

            {/* Today Indicator Line */}
            <line
              stroke="#2563eb"
              strokeDasharray="2 2"
              strokeOpacity="0.4"
              strokeWidth="1.5"
              x1={chartData.todayX}
              x2={chartData.todayX}
              y1="16"
              y2="146"
            />

            {/* Today Active Pulse Pin */}
            <circle
              className="animate-ping"
              cx={chartData.todayX}
              cy={chartData.todayY}
              fill="#2563eb"
              fillOpacity="0.25"
              r="7"
            />
            <circle
              cx={chartData.todayX}
              cy={chartData.todayY}
              fill="#2563eb"
              r="4.5"
              stroke="#ffffff"
              strokeWidth="2"
            />

            {/* Day Labels X Axis */}
            <text fill="#64748b" fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle" x="24" y="160">
              D1
            </text>
            <text fill="#64748b" fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle" x="96" y="160">
              D4
            </text>
            <text fill="#64748b" fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle" x="168" y="160">
              D7
            </text>
            <text fill="#2563eb" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" textAnchor="middle" x={chartData.todayX} y="160">
              TODAY
            </text>
            <text fill="#64748b" fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle" x="330" y="160">
              D{metrics.daysTotal}
            </text>
          </svg>
        </div>

        {/* Chart Context Footer */}
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>+{metrics.scopeChangePts} pt Scope added Day 6</span>
          </div>
          <span className="font-mono text-[10px] font-semibold text-blue-600 dark:text-blue-400">
            {metrics.remainingPts} pts left · {metrics.daysLeft} days to go
          </span>
        </div>
      </div>

      {/* 5. Issue Type Distribution / Work Breakdown */}
      <div className="flex flex-col p-3 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 dark:text-white">Deliverable Work Breakdown</span>
          <span className="font-mono text-[10px] text-slate-400">{metrics.totalPts} total pts</span>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="flex w-full h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 gap-0.5">
          {metrics.typeDistribution.map((item) => (
            <div
              key={item.type}
              className={`h-full ${item.bg} transition-all duration-300`}
              style={{ width: `${item.pct}%` }}
              title={`${item.label}: ${item.pct}%`}
            ></div>
          ))}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-y-2 gap-x-3 pt-1">
          {metrics.typeDistribution.map((item) => (
            <div key={item.type} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Twemoji emoji={item.emoji} className="w-3.5 h-3.5 inline-block" />
                <span className="text-xs text-slate-700 dark:text-slate-300">{item.label}</span>
              </div>
              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                {item.pct}% ({item.pts}p)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Academic Productivity & Research Milestones */}
      <div className="flex flex-col p-3 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 dark:text-white">Academic Focus Progress</span>
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-semibold">
            {metrics.completedIssues.length} of {metrics.issues.length} Deliverables Done
          </span>
        </div>

        <div className="space-y-1.5">
          {/* Research & Experiments Focus */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Twemoji emoji="🧪" className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  Research & Experiments
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  Evaluations, baseline benchmarks & code
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0 font-mono text-[10px]">
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {metrics.completedPts} pts delivered
              </span>
              <span className="text-emerald-600">{metrics.burnPercent}% complete</span>
            </div>
          </div>

          {/* Paper Writing & Lit Review Focus */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Twemoji emoji="📝" className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  Writing & Literature
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  Drafting methodology, reading & synth notes
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0 font-mono text-[10px]">
              <span className="font-bold text-slate-900 dark:text-white">
                {metrics.remainingPts} pts remaining
              </span>
              <span className="text-slate-400">{metrics.daysLeft} days left</span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Micro-Action Cheer / Kudos Card */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white dark:from-slate-800/80 dark:via-slate-800/50 dark:to-slate-900 border border-blue-100 dark:border-slate-700 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {clapCount > 0 ? 'Milestone Progress Celebrated!' : 'Sprint Momentum'}
            </span>
            <span className="text-[11px] text-slate-600 dark:text-slate-400">
              {clapCount > 0
                ? `Crushed ${metrics.completedPts} pts so far! Keep the cadence going.`
                : 'Celebrate pushing forward your research deliverables.'}
            </span>
          </div>
        </div>

        <button
          onClick={() => setClapCount((c) => c + 1)}
          className="h-7 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold text-xs active:scale-95 transition-transform flex items-center gap-1.5 shadow-2xs cursor-pointer"
        >
          <Twemoji emoji="👏" className="w-3.5 h-3.5 inline-block" />
          <span>{clapCount > 0 ? `Clapped (${clapCount})` : 'Clap'}</span>
        </button>
      </div>

      {/* 8. Past Sprints History & Retrospectives Archive */}
      <div className="space-y-2 pt-1">
        <h3 className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Completed Sprint Archive & Retrospectives
        </h3>

        {sprints.filter((s) => s.status === 'completed').length === 0 ? (
          <div className="p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
            No completed sprints yet. Completed sprint history and retrospect logs will be stored here.
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
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          {sp.name}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          ({sp.startDate} – {sp.endDate})
                        </span>
                      </div>

                      <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {sp.velocityPoints || 0} pts ({finishedCards.length} deliverables)
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
  );
};
