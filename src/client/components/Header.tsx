import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useWorkspace, formatHumanDate, format12HourTime, addDays, parseIsoDate, getTodayIsoDate, calculateAcademicWeek } from '../hooks/useWorkspace';
import { useAuth } from '../hooks/useAuth';
import { Search, Moon, Sun, Terminal, Database, Clock, ChevronDown, CheckCircle2, Menu, X, Calendar, User, Wifi, WifiOff, Sparkles, BellRing, Compass, SlidersHorizontal } from 'lucide-react';

interface HeaderProps {
  ws: ReturnType<typeof useWorkspace>;
  auth: ReturnType<typeof useAuth>;
  onOpenSemesterModal: () => void;
  onOpenTimeSlotsModal: () => void;
  onOpenBackupModal: () => void;
  onOpenCliModal: () => void;
  onOpenAiImportModal: () => void;
  onOpenRemindersModal: () => void;
  onOpenGuideModal: () => void;
  onOpenCustomizeViews: () => void;
}

interface HeaderTooltipButtonProps {
  onClick?: () => void;
  tooltip: string;
  align?: 'center' | 'right' | 'left';
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}

const HeaderTooltipButton: React.FC<HeaderTooltipButtonProps> = ({
  onClick,
  tooltip,
  align = 'center',
  className = '',
  children,
  ariaLabel,
}) => {
  const alignClass =
    align === 'right'
      ? 'right-0'
      : align === 'left'
      ? 'left-0'
      : 'left-1/2 -translate-x-1/2';

  const arrowClass =
    align === 'right'
      ? 'right-2.5'
      : align === 'left'
      ? 'left-2.5'
      : 'left-1/2 -translate-x-1/2';

  return (
    <div className="relative group inline-flex items-center">
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel || tooltip}
        className={className}
      >
        {children}
      </button>

      <div
        className={`pointer-events-none absolute top-full ${alignClass} mt-2 px-2.5 py-1 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-[11px] font-medium rounded-md shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50`}
      >
        {tooltip}
        <span
          className={`absolute -top-1 ${arrowClass} border-4 border-transparent border-b-slate-900 dark:border-b-slate-100`}
        />
      </div>
    </div>
  );
};

export const Header: React.FC<HeaderProps> = ({
  ws,
  auth,
  onOpenSemesterModal,
  onOpenTimeSlotsModal,
  onOpenBackupModal,
  onOpenCliModal,
  onOpenAiImportModal,
  onOpenRemindersModal,
  onOpenGuideModal,
  onOpenCustomizeViews,
}) => {
  const {
    viewedSemester,
    semesters,
    viewedSemesterId,
    setViewedSemesterId,
    selectedDate,
    setSelectedDate,
    currentAcademicWeek,
    searchQuery,
    setSearchQuery,
    isDarkMode,
    setIsDarkMode,
    isLiveClock,
    setIsLiveClock,
    simulatedMinutes,
    setSimulatedMinutes,
    showToast,
    workspaceMode,
    setWorkspaceMode,
    enabledTabs,
  } = ws;

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setIsToolsMenuOpen(false);
      }
    }
    if (isToolsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isToolsMenuOpen]);

  const humanDate = formatHumanDate(selectedDate);
  const isArchived = viewedSemester.isArchived || !viewedSemester.isActive;

  // Jump to today (real engine date)
  const handleJumpToday = () => {
    const todayIso = getTodayIsoDate();
    setSelectedDate(todayIso);
    const active = semesters.find(s => s.isActive);
    if (active) setViewedSemesterId(active.id);
    const todayWeek = active ? calculateAcademicWeek(todayIso, active.startDate) : currentAcademicWeek;
    showToast(`Jumped to Today (${formatHumanDate(todayIso)}, W${todayWeek})`);
  };

  // Week strip calculation (Sun .. Sat)
  const selUtc = parseIsoDate(selectedDate);
  const sunOffset = -selUtc.getUTCDay();
  const sundayIso = addDays(selectedDate, sunOffset);
  const stripLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 transition-colors">
      {/* Historical Archive Banner */}
      {isArchived && (
        <div className="bg-slate-900 dark:bg-slate-950 text-slate-200 px-4 py-2 text-xs border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[10px] uppercase tracking-wider">
                Archive Read-Only
              </span>
              <span className="text-slate-300 text-xs">Viewing {viewedSemester.name} in reference mode.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const active = semesters.find(s => s.isActive);
                  if (active) setViewedSemesterId(active.id);
                }}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              >
                Return to Active Term
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top Control Bar */}
        <div className="py-2 flex flex-wrap items-center justify-between gap-2.5">
          
          {/* Left: Week Badge + Date + Semester Dropdown */}
          <div className="flex items-center gap-2.5">
            <div className={`h-7 px-2 rounded-md flex items-center justify-center font-mono text-xs font-semibold tracking-tight tabular-nums ${
              isArchived ? 'bg-slate-600 text-white' : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
            }`}>
              W{currentAcademicWeek}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                  {humanDate}
                </h1>
                <span className="text-slate-300 dark:text-slate-700 text-xs">/</span>
                <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-medium border tabular-nums ${
                  currentAcademicWeek >= 1 && currentAcademicWeek <= viewedSemester.totalWeeks
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                }`}>
                  Week {currentAcademicWeek} / {viewedSemester.totalWeeks}
                </span>
              </div>

              {/* Term Selector */}
              <div className="flex items-center gap-2 mt-0.5">
                <div className="relative inline-flex items-center">
                  <select
                    value={viewedSemesterId}
                    onChange={(e) => setViewedSemesterId(e.target.value)}
                    aria-label="Select Semester"
                    className="appearance-none bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-xs font-medium rounded pl-1.5 pr-5 py-0.5 -ml-1.5 cursor-pointer transition focus:outline-none"
                  >
                    {semesters.map((s) => (
                      <option key={s.id} value={s.id} className="dark:bg-slate-800 dark:text-white">
                        {s.name} {s.isActive ? '' : '(Archive)'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-1 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 hidden md:inline">
                  · Start: {viewedSemester.startDate}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Desktop Controls (visible on md+) */}
          <div className="hidden md:flex items-center gap-1.5">
            {/* Group 1: Navigation */}
            <HeaderTooltipButton
              onClick={handleJumpToday}
              tooltip="Jump to today's schedule"
              className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 shadow-2xs"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${selectedDate === getTodayIsoDate() ? 'bg-emerald-500 shadow-xs shadow-emerald-400' : 'bg-slate-400 dark:bg-slate-500'}`} />
              <span>Today</span>
            </HeaderTooltipButton>

            {/* Quick Week Select */}
            <div className="relative">
              <select
                value={currentAcademicWeek}
                onChange={(e) => {
                  const targetWeek = parseInt(e.target.value, 10);
                  const dow = selUtc.getUTCDay() === 0 ? 7 : selUtc.getUTCDay();
                  const offset = (targetWeek - 1) * 7 + (dow - 1);
                  setSelectedDate(addDays(viewedSemester.startDate, offset));
                }}
                aria-label="Jump to Week"
                className="appearance-none bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono font-medium rounded-md border border-slate-200 dark:border-slate-700 pl-2.5 pr-6 py-1.5 cursor-pointer transition focus:outline-none tabular-nums shadow-2xs"
              >
                {Array.from({ length: viewedSemester.totalWeeks }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w} className="dark:bg-slate-800 dark:text-white">
                    Week {w}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Search Toggle */}
            <HeaderTooltipButton
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              tooltip="Search Workspace"
              className="p-1.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition flex items-center justify-center shadow-2xs"
            >
              <Search className="w-3.5 h-3.5" />
            </HeaderTooltipButton>

            {/* Class Reminders & Alarms Button */}
            <HeaderTooltipButton
              onClick={onOpenRemindersModal}
              tooltip="Class Reminders & Notifications"
              className="p-1.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition flex items-center justify-center shadow-2xs"
            >
              <BellRing className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            </HeaderTooltipButton>

            {/* Consolidated Tools & Utilities Dropdown Menu */}
            <div className="relative" ref={toolsMenuRef}>
              <HeaderTooltipButton
                onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                tooltip="Workspace Tools & Utilities"
                className={`px-2 py-1.5 rounded-md transition flex items-center gap-1.5 shadow-2xs border text-xs font-medium ${
                  isToolsMenuOpen
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Tools</span>
              </HeaderTooltipButton>

              {/* Tools Dropdown Popover */}
              {isToolsMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 text-xs">
                  <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                      Workspace Tools
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {workspaceMode === 'basic' ? 'Basic Mode' : 'Advanced Mode'}
                    </span>
                  </div>

                  {/* General Schedule Utilities */}
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenCustomizeViews();
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-2.5 transition text-slate-700 dark:text-slate-200"
                    >
                      <SlidersHorizontal className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                      <div>
                        <div className="font-medium text-xs flex items-center gap-1.5">
                          <span>Customize Views</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">{enabledTabs.length}/8</span>
                        </div>
                        <div className="text-[10px] text-slate-400">Toggle tabs, order & presets</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenSemesterModal();
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-2.5 transition text-slate-700 dark:text-slate-200"
                    >
                      <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                      <div>
                        <div className="font-medium text-xs">Manage Semesters & Terms</div>
                        <div className="text-[10px] text-slate-400">Create, switch, or edit terms & dates</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenAiImportModal();
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-2.5 transition text-slate-700 dark:text-slate-200"
                    >
                      <Sparkles className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                      <div>
                        <div className="font-medium text-xs">AI Schedule Import</div>
                        <div className="text-[10px] text-slate-400">Import timetable from text or syllabus</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenTimeSlotsModal();
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-2.5 transition text-slate-700 dark:text-slate-200"
                    >
                      <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                      <div>
                        <div className="font-medium text-xs">Configure Session Slots</div>
                        <div className="text-[10px] text-slate-400">Set period time bounds (S1–S12)</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenGuideModal();
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-2.5 transition text-slate-700 dark:text-slate-200"
                    >
                      <Compass className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                      <div>
                        <div className="font-medium text-xs">Getting Started Guide</div>
                        <div className="text-[10px] text-slate-400">View features & quick tour</div>
                      </div>
                    </button>
                  </div>

                  {/* Power Tools Section */}
                  <div className="border-t border-slate-100 dark:border-slate-800 py-1">
                    <div className="px-3 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Power Tools</span>
                      {workspaceMode === 'basic' && (
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold font-sans">Advanced</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenCliModal();
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-2.5 transition text-slate-700 dark:text-slate-200"
                    >
                      <Terminal className="w-4 h-4 text-slate-500 shrink-0" />
                      <div>
                        <div className="font-medium text-xs flex items-center gap-1.5">
                          <span>Terminal 'aw' CLI</span>
                          <span className="text-[9px] font-mono px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">v1.0</span>
                        </div>
                        <div className="text-[10px] text-slate-400">Terminal commands & shortcuts</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenBackupModal();
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-2.5 transition text-slate-700 dark:text-slate-200"
                    >
                      <Database className="w-4 h-4 text-slate-500 shrink-0" />
                      <div>
                        <div className="font-medium text-xs">Backup & Cloudflare D1</div>
                        <div className="text-[10px] text-slate-400">Export JSON & cloud sync</div>
                      </div>
                    </button>
                  </div>

                  {/* Mode Switcher */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 px-3 pb-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">Mode</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = workspaceMode === 'basic' ? 'research' : 'basic';
                          setWorkspaceMode(next);
                          showToast(`Switched to ${next === 'basic' ? 'Student Essentials' : 'Advanced Research Suite'}`);
                        }}
                        className="text-[11px] font-medium text-slate-900 dark:text-white hover:underline"
                      >
                        {workspaceMode === 'basic' ? 'Enable Advanced Mode' : 'Switch to Student Mode'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Group 4: Profile & Display */}
            {/* Auth / Local Mode / Offline Status Pill */}
            <HeaderTooltipButton
              onClick={auth.openAuthModal}
              align="right"
              tooltip={
                !auth.isOnline
                  ? 'Offline Mode (Local Storage active)'
                  : auth.isLoggedIn
                  ? `Signed in as ${auth.user?.name} · Cloud Sync Ready`
                  : 'Local Storage Mode (Click to Sign In)'
              }
              className={`px-2 py-1.5 rounded-md text-xs font-mono font-medium transition flex items-center gap-1.5 border shadow-2xs ${
                !auth.isOnline
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : auth.isLoggedIn
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                !auth.isOnline
                  ? 'bg-amber-500 animate-pulse'
                  : auth.isLoggedIn
                  ? 'bg-emerald-500'
                  : 'bg-slate-400 dark:bg-slate-500'
              }`} />
              <span className="hidden xl:inline">
                {!auth.isOnline
                  ? 'Offline'
                  : auth.isLoggedIn
                  ? (auth.user?.name ? auth.user.name.split(' ')[0] : 'Synced')
                  : 'Local'}
              </span>
            </HeaderTooltipButton>

            {/* Dark Mode Toggle */}
            <HeaderTooltipButton
              onClick={() => setIsDarkMode(!isDarkMode)}
              align="right"
              tooltip={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-1.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition flex items-center justify-center shadow-2xs"
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
            </HeaderTooltipButton>
          </div>

          {/* Right: Mobile Controls (Offline badge + Search + Drawer Menu Button) */}
          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            {!auth.isOnline && (
              <button
                type="button"
                onClick={auth.openAuthModal}
                className="px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[10px] font-mono font-medium flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Offline</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-1.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
              title="Search workspace"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="p-1.5 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs flex items-center gap-1 text-xs font-medium transition"
              title="Open Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Search Bar */}
        {isSearchOpen && (
          <div className="py-2 border-t border-slate-100 dark:border-slate-800">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by course code, room, task, paper, or experiment..."
                className="w-full pl-8 pr-16 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-slate-400 text-slate-900 dark:text-white transition"
                autoFocus
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 absolute right-2.5 top-1/2 -translate-y-1/2 font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Week Strip Row */}
        <div className="py-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          {/* Quick 7-Day Day Selector */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 text-xs transition"
              title="Previous Week"
            >
              &larr;
            </button>

            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
              {Array.from({ length: 7 }, (_, i) => {
                const dayIso = addDays(sundayIso, i);
                const dt = parseIsoDate(dayIso);
                const dayNum = dt.getUTCDate();
                const isSelected = dayIso === selectedDate;
                const isToday = dayIso === getTodayIsoDate();

                return (
                  <button
                    key={dayIso}
                    type="button"
                    onClick={() => setSelectedDate(dayIso)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono transition tabular-nums relative ${
                      isSelected
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-xs'
                        : isToday
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold border border-slate-300 dark:border-slate-700'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                    title={isToday ? `${formatHumanDate(dayIso)} (Today)` : formatHumanDate(dayIso)}
                  >
                    <span className={`text-[9px] ${isSelected ? 'text-slate-300 dark:text-slate-600' : isToday ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400'}`}>
                      {stripLabels[i]}
                    </span>
                    <span>{dayNum}</span>
                    {isToday && (
                      <span className={`w-1 h-1 rounded-full absolute bottom-0.5 right-0.5 ${isSelected ? 'bg-emerald-400' : 'bg-slate-900 dark:bg-white'}`} />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 text-xs transition"
              title="Next Week"
            >
              &rarr;
            </button>
          </div>

          {/* Clock Mode Toggle (Live vs Sim) */}
          <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap pl-2">
            <button
              type="button"
              onClick={() => setIsLiveClock(!isLiveClock)}
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono flex items-center gap-1 transition ${
                isLiveClock
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
              title="Toggle Live Clock vs Manual Slider"
            >
              <span className={`w-1 h-1 rounded-full ${isLiveClock ? 'bg-rose-600 animate-pulse' : 'bg-slate-400'}`} />
              <span>{isLiveClock ? 'Live' : 'Sim'}</span>
            </button>
            <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 font-semibold tabular-nums whitespace-nowrap">
              {format12HourTime(simulatedMinutes)}
            </span>
          </div>
        </div>

      </div>

      {/* Mobile Slide-Over Drawer Portal */}
      {isMobileDrawerOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999] md:hidden flex justify-end">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-[100dvh] shadow-2xl z-10 flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200 overflow-hidden">
            {/* Drawer Header */}
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-6 px-1.5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-mono text-[10px] font-bold flex items-center justify-center">
                  W{currentAcademicWeek}
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Quick Menu
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-3.5 overflow-y-auto space-y-4 flex-1">
              {/* Account & Sync Status Card */}
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    !auth.isOnline ? 'bg-amber-500 animate-pulse' : auth.isLoggedIn ? 'bg-emerald-500' : 'bg-slate-400'
                  }`} />
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {!auth.isOnline ? 'Offline Mode' : auth.isLoggedIn ? (auth.user?.name || 'Google Synced') : 'Local Storage Mode'}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[140px]">
                      {!auth.isOnline ? 'Working offline safely' : auth.isLoggedIn ? auth.user?.email : 'No account required'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    auth.openAuthModal();
                  }}
                  className="px-2 py-1 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs text-slate-700 dark:text-slate-200 font-medium shrink-0"
                >
                  {auth.isLoggedIn ? 'Account' : 'Sync'}
                </button>
              </div>

              {/* Clock Mode Toggle Card */}
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isLiveClock ? 'bg-rose-600 animate-pulse' : 'bg-slate-400'}`} />
                    <span>Clock: {isLiveClock ? 'Live Real-Time' : 'Simulated Time'}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    Current: <span className="font-semibold text-slate-700 dark:text-slate-300">{format12HourTime(simulatedMinutes)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLiveClock(!isLiveClock)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-medium border transition ${
                    isLiveClock
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {isLiveClock ? 'Switch to Sim' : 'Switch to Live'}
                </button>
              </div>

              {/* Date & Week Section */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold px-1">
                  Calendar & Week
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleJumpToday();
                    setIsMobileDrawerOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 transition"
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${selectedDate === getTodayIsoDate() ? 'bg-emerald-500 shadow-xs shadow-emerald-400' : 'bg-slate-400 dark:bg-slate-500'}`} />
                    <span>Jump to Today</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {formatHumanDate(getTodayIsoDate()).split(',')[1]?.trim() || 'Today'}
                  </span>
                </button>

                <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1 bg-slate-50/40 dark:bg-slate-800/40">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                    Jump to Academic Week:
                  </label>
                  <select
                    value={currentAcademicWeek}
                    onChange={(e) => {
                      const targetWeek = parseInt(e.target.value, 10);
                      const dow = selUtc.getUTCDay() === 0 ? 7 : selUtc.getUTCDay();
                      const offset = (targetWeek - 1) * 7 + (dow - 1);
                      setSelectedDate(addDays(viewedSemester.startDate, offset));
                      setIsMobileDrawerOpen(false);
                    }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 text-xs font-mono font-medium text-slate-800 dark:text-slate-200"
                  >
                    {Array.from({ length: viewedSemester.totalWeeks }, (_, i) => i + 1).map((w) => (
                      <option key={w} value={w}>
                        Week {w} {w === currentAcademicWeek ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Workspace Tools Section */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold px-1">
                  Workspace Tools
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenCustomizeViews();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium transition"
                >
                  <div className="flex items-center gap-2.5">
                    <SlidersHorizontal className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span>Customize Views</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold">
                    {enabledTabs.length}/8
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenSemesterModal();
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 transition"
                >
                  <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>Manage Semesters & Terms</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenGuideModal();
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 transition"
                >
                  <Compass className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>Getting Started Guide</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenAiImportModal();
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 transition"
                >
                  <Sparkles className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Import Schedule with AI</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenRemindersModal();
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 transition"
                >
                  <BellRing className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Class Reminders & Calendar Alarms</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenTimeSlotsModal();
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 transition"
                >
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Configure Session Slots</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenCliModal();
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 transition"
                >
                  <Terminal className="w-4 h-4 text-slate-500" />
                  <span>Terminal 'aw' CLI Guide</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenBackupModal();
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 transition"
                >
                  <Database className="w-4 h-4 text-slate-500" />
                  <span>Database Backup / Cloudflare D1</span>
                </button>
              </div>

              {/* Preferences & Appearance */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold px-1">
                  Appearance & Theme
                </div>
                <button
                  type="button"
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="w-full flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 transition"
                >
                  <span className="flex items-center gap-2">
                    {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                    <span>{isDarkMode ? 'Dark Theme' : 'Light Theme'}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Toggle</span>
                </button>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[10px] text-slate-400 font-mono flex items-center justify-between shrink-0">
              <span>Term: {viewedSemester.name}</span>
              <span>v1.0</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};
