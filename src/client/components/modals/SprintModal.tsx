import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { Sprint, SprintAutomationPolicies, SprintStreamAllocation } from '../../../types';
import { ModalSheet } from '../common/ModalSheet';
import { Twemoji } from '../common/Twemoji';
import {
  Calendar,
  Flag,
  Target,
  X,
  Check,
  Clock,
  TrendingUp,
  AlertCircle,
  Pause,
  Play,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Sliders,
  ChevronRight,
  Minus,
  Plus,
} from 'lucide-react';

interface SprintModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
  initialSprint?: Sprint | null;
}

const DEFAULT_STREAMS: { id: string; name: string; emoji: string; defaultPts: number }[] = [
  { id: 'exp', name: 'Experimentation & Runs', emoji: '🧪', defaultPts: 16 },
  { id: 'paper', name: 'Paper Drafting & Lit Review', emoji: '📝', defaultPts: 12 },
  { id: 'code', name: 'Code & Dev', emoji: '💻', defaultPts: 10 },
  { id: 'course', name: 'Coursework & Misc', emoji: '📚', defaultPts: 4 },
];

export const SprintModal: React.FC<SprintModalProps> = ({ ws, isOpen, onClose, initialSprint }) => {
  const { viewedSemester, saveSprint, deleteSprint, completeSprint, sprints, kanban } = ws;

  // Basic Details
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'planned' | 'active' | 'completed'>('planned');

  // Capacity & Stream Allocations
  const [maxCapacity, setMaxCapacity] = useState<number>(45);
  const [streamAllocations, setStreamAllocations] = useState<SprintStreamAllocation[]>([]);

  // Automation Policies
  const [autoCloseOnEndDate, setAutoCloseOnEndDate] = useState(true);
  const [carryOverUnfinished, setCarryOverUnfinished] = useState(true);
  const [requireArtifactForDone, setRequireArtifactForDone] = useState(false);

  // Status flags
  const [isPaused, setIsPaused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialSprint) {
      setName(initialSprint.name);
      setGoal(initialSprint.goal || '');
      setStartDate(initialSprint.startDate);
      setEndDate(initialSprint.endDate);
      setStatus(initialSprint.status);
      setMaxCapacity(initialSprint.maxCapacity ?? 45);
      setIsPaused(!!initialSprint.isPaused);

      // Policies
      if (initialSprint.policies) {
        setAutoCloseOnEndDate(initialSprint.policies.autoCloseOnEndDate ?? true);
        setCarryOverUnfinished(initialSprint.policies.carryOverUnfinished ?? true);
        setRequireArtifactForDone(initialSprint.policies.requireArtifactForDone ?? false);
      } else {
        setAutoCloseOnEndDate(true);
        setCarryOverUnfinished(true);
        setRequireArtifactForDone(false);
      }

      // Stream Allocations
      if (initialSprint.streamAllocations && initialSprint.streamAllocations.length > 0) {
        setStreamAllocations(initialSprint.streamAllocations);
      } else {
        setStreamAllocations(
          DEFAULT_STREAMS.map((s) => ({
            id: s.id,
            stream: s.id,
            name: s.name,
            points: s.defaultPts,
          }))
        );
      }
    } else {
      const nextNum = sprints.length + 1;
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const twoWeeksLater = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
      const endStr = twoWeeksLater.toISOString().split('T')[0];

      setName(`Sprint ${nextNum}`);
      setGoal('');
      setStartDate(todayStr);
      setEndDate(endStr);
      setStatus('planned');
      setMaxCapacity(45);
      setIsPaused(false);
      setAutoCloseOnEndDate(true);
      setCarryOverUnfinished(true);
      setRequireArtifactForDone(false);
      setStreamAllocations(
        DEFAULT_STREAMS.map((s) => ({
          id: s.id,
          stream: s.id,
          name: s.name,
          points: s.defaultPts,
        }))
      );
    }
  }, [initialSprint, isOpen, sprints.length]);

  if (!isOpen) return null;

  // Preset Date Range Helpers
  const handleApplyPreset = (days: number) => {
    const base = startDate ? new Date(startDate) : new Date();
    const newEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    setEndDate(newEnd.toISOString().split('T')[0]);
  };

  // Stream Allocation Point Adjuster
  const handleUpdateStreamPoints = (streamId: string, delta: number) => {
    setStreamAllocations((prev) =>
      prev.map((stream) => {
        if (stream.id !== streamId && stream.stream !== streamId) return stream;
        const newPts = Math.max(0, stream.points + delta);
        return { ...stream, points: newPts };
      })
    );
  };

  // Metrics for Sprint Bento Health Card
  const sprintIssues = kanban.filter((k) => k.sprintId === initialSprint?.id);
  const committedPts = sprintIssues.reduce((acc, k) => acc + (k.storyPoints || 1), 0);
  const doneIssues = sprintIssues.filter((k) => k.stage === 'done');
  const donePts = doneIssues.reduce((acc, k) => acc + (k.storyPoints || 1), 0);
  const inFlightIssues = sprintIssues.filter(
    (k) => k.stage === 'in_progress' || k.stage === 'review' || k.stage === 'experiments'
  );
  const inFlightPts = inFlightIssues.reduce((acc, k) => acc + (k.storyPoints || 1), 0);
  const openIssues = sprintIssues.filter((k) => k.stage === 'todo' || k.stage === 'lit_review' || k.stage === 'drafting');
  const openPts = openIssues.reduce((acc, k) => acc + (k.storyPoints || 1), 0);

  const donePercent = committedPts > 0 ? Math.round((donePts / committedPts) * 100) : 0;
  const inFlightPercent = committedPts > 0 ? Math.round((inFlightPts / committedPts) * 100) : 0;
  const openPercent = Math.max(0, 100 - donePercent - inFlightPercent);

  // Remaining days calculation
  const getRemainingDays = () => {
    if (!endDate) return 0;
    const now = new Date();
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };
  const daysRemaining = getRemainingDays();

  // Total allocated stream points
  const totalAllocatedStreams = streamAllocations.reduce((acc, s) => acc + s.points, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) return;

    setIsSaving(true);
    try {
      const policies: SprintAutomationPolicies = {
        autoCloseOnEndDate,
        carryOverUnfinished,
        requireArtifactForDone,
      };

      const sprintData: Sprint = {
        id: initialSprint ? initialSprint.id : 'sp_' + Date.now().toString(36),
        semesterId: viewedSemester?.id,
        name: name.trim(),
        goal: goal.trim() || undefined,
        startDate,
        endDate,
        status,
        velocityPoints: initialSprint?.velocityPoints || committedPts,
        retrospective: initialSprint?.retrospective,
        maxCapacity,
        isPaused,
        policies,
        streamAllocations,
      };

      await saveSprint(sprintData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialSprint) return;
    if (window.confirm(`Are you sure you want to delete ${initialSprint.name}? All issues will be moved to the Backlog.`)) {
      await deleteSprint(initialSprint.id);
      onClose();
    }
  };

  const handleCompleteEarly = async () => {
    if (!initialSprint) return;
    if (window.confirm(`Complete ${initialSprint.name} early? Unfinished tasks will roll over to the backlog.`)) {
      await completeSprint(initialSprint.id);
      onClose();
    }
  };

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} maxWidthClass="sm:max-w-xl">
      {({ requestClose, dragHandleProps }) => (
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
          {/* Draggable Header with Breadcrumbs & Status */}
          <div
            {...dragHandleProps}
            className="px-4 py-3 sm:px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 cursor-grab active:cursor-grabbing select-none"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] font-semibold text-slate-400">Sprints</span>
                <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-700" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {name || 'New Sprint'}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                  status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : status === 'completed'
                    ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                }`}
              >
                {status === 'active' ? (isPaused ? 'Paused' : 'Active Sprint') : status}
              </span>

              {daysRemaining > 0 && status === 'active' && (
                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                  {daysRemaining}d left
                </span>
              )}

              <button
                type="button"
                onClick={requestClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Body Content */}
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0 text-slate-700 dark:text-slate-300">
            
            {/* 1. Quick Status & Health Bento Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Cycle Health & Pace
                </span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {startDate} — {endDate}
                </span>
              </div>

              {/* 4 Bento Metric Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex flex-col">
                  <span className="text-[10px] text-slate-400 font-medium">Target SP</span>
                  <span className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                    {maxCapacity} <span className="text-xs font-normal text-slate-400">pts</span>
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex flex-col">
                  <span className="text-[10px] text-slate-400 font-medium">Committed SP</span>
                  <span className="text-base font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                    {committedPts} <span className="text-xs font-normal text-slate-400">pts</span>
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex flex-col">
                  <span className="text-[10px] text-slate-400 font-medium">Done SP %</span>
                  <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {donePercent}%
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex flex-col">
                  <span className="text-[10px] text-slate-400 font-medium">Remaining Days</span>
                  <span className="text-base font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {daysRemaining} <span className="text-xs font-normal text-slate-400">days</span>
                  </span>
                </div>
              </div>

              {/* Segmented Linear Burndown Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                  {donePercent > 0 && (
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${donePercent}%` }}
                      title={`Done: ${donePts} SP`}
                    />
                  )}
                  {inFlightPercent > 0 && (
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${inFlightPercent}%` }}
                      title={`In Flight: ${inFlightPts} SP`}
                    />
                  )}
                  {openPercent > 0 && (
                    <div
                      className="h-full bg-slate-300 dark:bg-slate-600 transition-all duration-300"
                      style={{ width: `${openPercent}%` }}
                      title={`Open: ${openPts} SP`}
                    />
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Done: {donePts} SP</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>In Flight: {inFlightPts} SP</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span>Open: {openPts} SP</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Sprint Details Card */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Sprint Details
              </span>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sprint Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sprint 24: Core Engine Beta"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Sprint Goal (Key Outcome)
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">
                    {goal.length} / 280
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={280}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="What key deliverable or research milestone will be completed this cycle?"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none"
                />
              </div>

              {/* Date Pickers & Duration Presets */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Start Date</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Flag className="w-3 h-3 text-slate-400" />
                      <span>End Date</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Duration Presets */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                    Presets:
                  </span>
                  {[
                    { label: '1 wk', days: 7 },
                    { label: '2 wks', days: 14 },
                    { label: '3 wks', days: 21 },
                    { label: '4 wks', days: 28 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleApplyPreset(preset.days)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Capacity Planning Card */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Capacity Planning
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Ceiling: <strong className="text-slate-900 dark:text-white">{maxCapacity} SP</strong>
                </span>
              </div>

              {/* Max Sprint Ceiling Slider */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Max Sprint Velocity Ceiling</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={10}
                      max={120}
                      value={maxCapacity}
                      onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 30)}
                      className="w-14 px-2 py-0.5 text-xs text-right font-mono font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                    <span className="font-mono text-slate-400 text-xs">SP</span>
                  </div>
                </div>

                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(parseInt(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />

                <p className="text-[10px] text-slate-400 leading-relaxed">
                  💡 Tip: Maintain a 15–20% capacity buffer for spontaneous experiment runs and paper review iterations.
                </p>
              </div>

              {/* Research Focus Streams (Personal Academic Allocation) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Focus Stream Allocations
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {totalAllocatedStreams} / {maxCapacity} SP allocated
                  </span>
                </div>

                <div className="space-y-1.5">
                  {DEFAULT_STREAMS.map((streamDef) => {
                    const currentStream = streamAllocations.find(
                      (s) => s.id === streamDef.id || s.stream === streamDef.id
                    ) || {
                      id: streamDef.id,
                      stream: streamDef.id,
                      name: streamDef.name,
                      points: streamDef.defaultPts,
                    };

                    const pct = Math.round((currentStream.points / (maxCapacity || 1)) * 100);

                    return (
                      <div
                        key={streamDef.id}
                        className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                            <Twemoji emoji={streamDef.emoji} className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0">
                            <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate">
                              {streamDef.name}
                            </h5>
                            <span className="text-[10px] font-mono text-slate-400">
                              {pct}% of capacity
                            </span>
                          </div>
                        </div>

                        {/* Point Stepper */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateStreamPoints(streamDef.id, -2)}
                            className="w-6 h-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-mono font-bold text-xs text-slate-800 dark:text-white">
                            {currentStream.points}p
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateStreamPoints(streamDef.id, 2)}
                            className="w-6 h-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 4. Sprint Automation & Policies */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Sprint Automation & Policies
              </span>

              <div className="space-y-2">
                {/* Switch 1: Auto-close */}
                <div className="flex items-start justify-between gap-3 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="min-w-0">
                    <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      Auto-close on end date
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Automatically prompt or archive sprint review when the schedule concludes
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoCloseOnEndDate(!autoCloseOnEndDate)}
                    className={`w-10 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                      autoCloseOnEndDate ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                        autoCloseOnEndDate ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Switch 2: Carry over unfinished */}
                <div className="flex items-start justify-between gap-3 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="min-w-0">
                    <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      Carry over unfinished issues
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Roll uncompleted deliverables forward into the next planned sprint or backlog
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCarryOverUnfinished(!carryOverUnfinished)}
                    className={`w-10 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                      carryOverUnfinished ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                        carryOverUnfinished ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Switch 3: Require artifact */}
                <div className="flex items-start justify-between gap-3 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="min-w-0">
                    <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      Require artifact for 'Done'
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Requires at least one attached link, PR, manuscript, or log trace to close an issue
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequireArtifactForDone(!requireArtifactForDone)}
                    className={`w-10 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                      requireArtifactForDone ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                        requireArtifactForDone ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* 5. Sprint Actions & Danger Zone */}
            {initialSprint && (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Sprint Actions
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {status === 'active' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsPaused(!isPaused)}
                        className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors"
                      >
                        {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-600" /> : <Pause className="w-3.5 h-3.5 text-amber-600" />}
                        <span>{isPaused ? 'Resume Tracking' : 'Pause Tracking'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCompleteEarly}
                        className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-medium text-xs transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Complete Early</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-medium text-xs transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete Sprint</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Docked Floating Action Bar */}
          <div className="px-4 py-2.5 sm:px-5 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-400 font-mono">
              {initialSprint ? 'Cycle settings synced' : 'New cycle configuration'}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={requestClose}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 transition shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Sprint</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </ModalSheet>
  );
};
