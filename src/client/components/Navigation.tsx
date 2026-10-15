import React, { useState, useRef, useEffect } from 'react';
import { TabKey, useWorkspace, TAB_METADATA, ALL_TABS, BASIC_TABS } from '../hooks/useWorkspace';
import {
  Calendar,
  LayoutGrid,
  CheckSquare,
  GitPullRequest,
  BookOpen,
  Users,
  Trophy,
  FlaskConical,
  SlidersHorizontal,
  GraduationCap,
  Microscope,
  X,
} from 'lucide-react';

interface NavigationProps {
  ws: ReturnType<typeof useWorkspace>;
  onOpenGuideModal?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ ws, onOpenGuideModal }) => {
  const {
    activeTab,
    setActiveTab,
    workspaceMode,
    setWorkspaceMode,
    enabledTabs,
    toggleTabVisibility,
    tasks,
    kanban,
    papers,
    conferences,
    experimentLogs,
  } = ws;

  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCustomizeOpen(false);
      }
    }
    if (isCustomizeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCustomizeOpen]);

  const pendingTasksCount = tasks.filter(t => t.status !== 'completed').length;
  const kanbanCount = kanban.length;
  const papersCount = papers.length;
  const confCount = conferences.length;
  const expCount = experimentLogs.length;

  const tabIcons: Record<TabKey, React.ReactNode> = {
    timeline: <Calendar className="w-3.5 h-3.5" />,
    courses: <LayoutGrid className="w-3.5 h-3.5" />,
    todo: <CheckSquare className="w-3.5 h-3.5" />,
    kanban: <GitPullRequest className="w-3.5 h-3.5" />,
    papers: <BookOpen className="w-3.5 h-3.5" />,
    advisor: <Users className="w-3.5 h-3.5" />,
    conferences: <Trophy className="w-3.5 h-3.5" />,
    experiments: <FlaskConical className="w-3.5 h-3.5" />,
  };

  const tabBadges: Partial<Record<TabKey, number>> = {
    todo: pendingTasksCount,
    kanban: kanbanCount,
    papers: papersCount,
    conferences: confCount,
    experiments: expCount,
  };

  const visibleTabs = ALL_TABS.filter(t => enabledTabs.includes(t));

  const essentialTabs = ALL_TABS.filter(t => TAB_METADATA[t].group === 'essentials');
  const researchTabs = ALL_TABS.filter(t => TAB_METADATA[t].group === 'research');

  return (
    <div className="border-b border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between gap-2 py-1.5">
          {/* Main Tabs Navigation */}
          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5" aria-label="Academic Workspace Views">
            {visibleTabs.map((key) => {
              const meta = TAB_METADATA[key];
              const isActive = activeTab === key;
              const badge = tabBadges[key];

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {tabIcons[key]}
                  <span>{meta.label}</span>
                  {typeof badge === 'number' && badge > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums ${
                        isActive
                          ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Customization Control */}
          <div className="flex items-center shrink-0 relative" ref={dropdownRef}>
            {/* Customize Dropdown Button */}
            <button
              type="button"
              onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition ${
                isCustomizeOpen
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title="Customize workspace views & toggle modes"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Views</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {enabledTabs.length}/8
              </span>
            </button>

            {/* Customization Dropdown Popover */}
            {isCustomizeOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Customize Workspace Views</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Toggle tabs to match your workflow ({enabledTabs.length} active)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCustomizeOpen(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Presets inside dropdown */}
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 mb-2">
                    Quick View Presets
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWorkspaceMode('basic')}
                      className={`px-2.5 py-1.5 rounded-lg border text-left flex items-center gap-2 transition ${
                        workspaceMode === 'basic'
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <div>
                        <div className="text-xs font-medium">Basic Student</div>
                        <div className="text-[10px] text-slate-400">3 core views</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWorkspaceMode('research')}
                      className={`px-2.5 py-1.5 rounded-lg border text-left flex items-center gap-2 transition ${
                        workspaceMode === 'research'
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <Microscope className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div>
                        <div className="text-xs font-medium">Advanced</div>
                        <div className="text-[10px] text-slate-400">All 8 views</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Tab Toggles by Group */}
                <div className="p-3 space-y-3 max-h-[340px] overflow-y-auto">
                  {/* Essentials Group */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 px-1">
                      Daily Academic Essentials
                    </div>
                    {essentialTabs.map((key) => {
                      const isEnabled = enabledTabs.includes(key);
                      const meta = TAB_METADATA[key];
                      return (
                        <label
                          key={key}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition select-none group"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {tabIcons[key]}
                            </span>
                            <div>
                              <div className="text-xs font-medium text-slate-900 dark:text-white">
                                {meta.label}
                              </div>
                              <div className="text-[11px] text-slate-400 leading-tight">
                                {meta.description}
                              </div>
                            </div>
                          </div>

                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => toggleTabVisibility(key)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800 cursor-pointer"
                          />
                        </label>
                      );
                    })}
                  </div>

                  {/* Research Group */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 px-1">
                      Projects & Advanced Workflow
                    </div>
                    {researchTabs.map((key) => {
                      const isEnabled = enabledTabs.includes(key);
                      const meta = TAB_METADATA[key];
                      return (
                        <label
                          key={key}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition select-none group"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {tabIcons[key]}
                            </span>
                            <div>
                              <div className="text-xs font-medium text-slate-900 dark:text-white">
                                {meta.label}
                              </div>
                              <div className="text-[11px] text-slate-400 leading-tight">
                                {meta.description}
                              </div>
                            </div>
                          </div>

                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => toggleTabVisibility(key)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800 cursor-pointer"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Popover Footer */}
                <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  {onOpenGuideModal ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomizeOpen(false);
                        onOpenGuideModal();
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <span>Getting Started Guide</span>
                      <span>&rarr;</span>
                    </button>
                  ) : (
                    <span className="text-slate-400 font-mono">Saved automatically</span>
                  )}
                  <span className="text-indigo-600 dark:text-indigo-400 font-sans font-medium">
                    {workspaceMode.toUpperCase()} MODE
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
