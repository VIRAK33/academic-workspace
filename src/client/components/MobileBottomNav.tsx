import React, { useState, useRef, useEffect } from 'react';
import { useWorkspace, TabKey } from '../hooks/useWorkspace';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import {
  Calendar,
  LayoutGrid,
  CheckSquare,
  FlaskConical,
  Menu,
  ChevronUp,
  GitPullRequest,
  BookOpen,
  Users,
  Trophy,
} from 'lucide-react';

interface MobileBottomNavProps {
  ws: ReturnType<typeof useWorkspace>;
  onOpenMobileDrawer: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ ws, onOpenMobileDrawer }) => {
  const { activeTab, setActiveTab, tasks, kanban, papers, conferences, experimentLogs, enabledTabs, workspaceMode } = ws;

  const [isResearchMenuOpen, setIsResearchMenuOpen] = useState(false);
  const researchMenuRef = useRef<HTMLDivElement>(null);

  const pendingTasksCount = tasks.filter(t => t.status !== 'completed').length;
  const isResearchActive = ['kanban', 'papers', 'advisor', 'conferences', 'experiments'].includes(activeTab);

  // Close research menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (researchMenuRef.current && !researchMenuRef.current.contains(event.target as Node)) {
        setIsResearchMenuOpen(false);
      }
    }
    if (isResearchMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isResearchMenuOpen]);

  const researchTabs: Array<{ key: TabKey; label: string; icon: React.ReactNode; count?: number }> = [
    { key: 'kanban' as TabKey, label: 'Kanban', icon: <GitPullRequest className="w-3.5 h-3.5" />, count: kanban.length },
    { key: 'papers' as TabKey, label: 'Papers', icon: <BookOpen className="w-3.5 h-3.5" />, count: papers.length },
    { key: 'advisor' as TabKey, label: 'Advisor', icon: <Users className="w-3.5 h-3.5" /> },
    { key: 'conferences' as TabKey, label: 'Conferences', icon: <Trophy className="w-3.5 h-3.5" />, count: conferences.length },
    { key: 'experiments' as TabKey, label: 'Experiments', icon: <FlaskConical className="w-3.5 h-3.5" />, count: experimentLogs.length },
  ].filter(t => enabledTabs.includes(t.key));

  // Only show research menu if user is not in basic mode and has at least one research tab enabled
  const showResearchTab = workspaceMode !== 'basic' && researchTabs.length > 0;

  // Lock background body scroll when research popup sheet is open
  useBodyScrollLock(showResearchTab && isResearchMenuOpen);

  return (
    <>
      {/* Research Views Popup Sheet for Mobile */}
      {showResearchTab && isResearchMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-2xs md:hidden overscroll-contain touch-none"
          onClick={() => setIsResearchMenuOpen(false)}
          onTouchMove={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
            }
          }}
        >
          <div
            ref={researchMenuRef}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+60px)] inset-x-3 max-w-sm mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-2.5 space-y-1 animate-in slide-in-from-bottom-3 duration-150 overscroll-contain"
          >
            <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Research & Lab Suite
            </div>
            {researchTabs.map((item) => {
              const isCurrent = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.key);
                    setIsResearchMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                    isCurrent
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums ${
                      isCurrent
                        ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 md:hidden px-2 pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+6px)] flex items-center justify-around shadow-lg"
        aria-label="Mobile Navigation"
      >
        {/* 1. Schedule */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('timeline');
            setIsResearchMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-100 active:scale-90 cursor-pointer ${
            activeTab === 'timeline'
              ? 'text-slate-900 dark:text-white font-semibold'
              : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Schedule</span>
        </button>

        {/* 2. Timetable */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('courses');
            setIsResearchMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-100 active:scale-90 cursor-pointer ${
            activeTab === 'courses'
              ? 'text-slate-900 dark:text-white font-semibold'
              : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Timetable</span>
        </button>

        {/* 3. Tasks */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('todo');
            setIsResearchMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-100 active:scale-90 relative cursor-pointer ${
            activeTab === 'todo'
              ? 'text-slate-900 dark:text-white font-semibold'
              : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
          }`}
        >
          <div className="relative">
            <CheckSquare className="w-4 h-4" />
            {pendingTasksCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[8px] font-mono font-bold leading-none tabular-nums shadow-xs">
                {pendingTasksCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Tasks</span>
        </button>

        {/* 4. Research (Only visible when research mode is active and tabs are enabled) */}
        {showResearchTab && (
          <button
            type="button"
            onClick={() => {
              if (isResearchActive) {
                setIsResearchMenuOpen(!isResearchMenuOpen);
              } else {
                // Default to first enabled research tab or toggle popup
                const defaultResearch = researchTabs[0]?.key || 'kanban';
                setActiveTab(defaultResearch);
                setIsResearchMenuOpen(true);
              }
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-100 active:scale-90 relative cursor-pointer ${
              isResearchActive
                ? 'text-slate-900 dark:text-white font-semibold'
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-0.5">
              <FlaskConical className="w-4 h-4" />
              <ChevronUp className={`w-2.5 h-2.5 transition-transform ${isResearchMenuOpen ? 'rotate-180' : ''}`} />
            </div>
            <span className="text-[10px] mt-0.5">Research</span>
          </button>
        )}

        {/* 5. Menu */}
        <button
          type="button"
          onClick={() => {
            setIsResearchMenuOpen(false);
            onOpenMobileDrawer();
          }}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-100 active:scale-90 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Menu</span>
        </button>
      </nav>
    </>
  );
};
