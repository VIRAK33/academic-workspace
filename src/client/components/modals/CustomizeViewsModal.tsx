import React from 'react';
import { useWorkspace, TAB_METADATA, ALL_TABS, TabKey } from '../../hooks/useWorkspace';
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
  Check,
} from 'lucide-react';

interface CustomizeViewsModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
}

export const CustomizeViewsModal: React.FC<CustomizeViewsModalProps> = ({ ws, isOpen, onClose }) => {
  const {
    workspaceMode,
    setWorkspaceMode,
    enabledTabs,
    toggleTabVisibility,
    showToast,
  } = ws;

  if (!isOpen) return null;

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

  const essentialTabs = ALL_TABS.filter((t) => TAB_METADATA[t].group === 'essentials');
  const researchTabs = ALL_TABS.filter((t) => TAB_METADATA[t].group === 'research');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85dvh] sm:max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <span>Customize Workspace Views</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Toggle tabs to match your workflow ({enabledTabs.length} of 8 active)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-3.5 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Quick Presets */}
          <div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 mb-2 font-mono">
              Quick View Presets
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setWorkspaceMode('basic');
                  showToast('Switched to Student Essentials (3 views)');
                }}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition ${
                  workspaceMode === 'basic'
                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-900 dark:border-white text-slate-900 dark:text-white shadow-2xs font-semibold'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="p-1.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold">Student Essentials</div>
                  <div className="text-[10px] text-slate-400">3 core daily views</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setWorkspaceMode('research');
                  showToast('Switched to Advanced Research Suite (8 views)');
                }}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition ${
                  workspaceMode === 'research'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 shadow-2xs'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 shrink-0">
                  <Microscope className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold">Advanced Research</div>
                  <div className="text-[10px] text-slate-400">All 8 research views</div>
                </div>
              </button>
            </div>
          </div>

          {/* Group 1: Daily Academic Essentials */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 px-1 font-mono">
              Daily Academic Essentials
            </div>
            {essentialTabs.map((key) => {
              const isEnabled = enabledTabs.includes(key);
              const meta = TAB_METADATA[key];
              return (
                <label
                  key={key}
                  className={`flex items-center justify-between p-2 sm:p-2.5 rounded-lg border transition cursor-pointer select-none ${
                    isEnabled
                      ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xs'
                      : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 opacity-60 hover:opacity-90'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                      {tabIcons[key]}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-900 dark:text-white truncate">
                        {meta.label}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {meta.description}
                      </div>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => toggleTabVisibility(key)}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 dark:border-slate-600 dark:bg-slate-800 cursor-pointer shrink-0 accent-slate-900 dark:accent-white"
                  />
                </label>
              );
            })}
          </div>

          {/* Group 2: Projects & Workflow */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 px-1 font-mono">
              PhD Projects & Advanced Workflow
            </div>
            {researchTabs.map((key) => {
              const isEnabled = enabledTabs.includes(key);
              const meta = TAB_METADATA[key];
              return (
                <label
                  key={key}
                  className={`flex items-center justify-between p-2 sm:p-2.5 rounded-lg border transition cursor-pointer select-none ${
                    isEnabled
                      ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xs'
                      : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 opacity-60 hover:opacity-90'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                      {tabIcons[key]}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-900 dark:text-white truncate">
                        {meta.label}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {meta.description}
                      </div>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => toggleTabVisibility(key)}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 dark:border-slate-600 dark:bg-slate-800 cursor-pointer shrink-0 accent-slate-900 dark:accent-white"
                  />
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 sm:px-5 sm:py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
          <span className="text-[11px] font-mono text-slate-400">
            {enabledTabs.length} views visible
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
