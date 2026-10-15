import React, { useState } from 'react';
import {
  X,
  Compass,
  GraduationCap,
  Sparkles,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  BellRing,
  Terminal,
  Cloud,
  Check,
  ChevronRight,
} from 'lucide-react';
import { useWorkspace, UserWorkspaceMode } from '../../hooks/useWorkspace';

interface WelcomeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  ws: ReturnType<typeof useWorkspace>;
  onOpenAiImportModal: () => void;
}

export const WelcomeGuideModal: React.FC<WelcomeGuideModalProps> = ({
  isOpen,
  onClose,
  ws,
  onOpenAiImportModal,
}) => {
  const { workspaceMode, setWorkspaceMode, showToast } = ws;

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedMode, setSelectedMode] = useState<UserWorkspaceMode>(
    workspaceMode === 'basic' ? 'basic' : 'research'
  );
  const [dontShowAgain, setDontShowAgain] = useState(true);

  if (!isOpen) return null;

  const handleFinish = () => {
    if (dontShowAgain) {
      localStorage.setItem('phd_workspace_has_onboarded_v1', 'true');
    }
    onClose();
    showToast('Welcome to Academic Workspace!');
  };

  const handleSelectMode = (mode: UserWorkspaceMode) => {
    setSelectedMode(mode);
    setWorkspaceMode(mode);
  };

  const handleLaunchAiImport = () => {
    if (dontShowAgain) {
      localStorage.setItem('phd_workspace_has_onboarded_v1', 'true');
    }
    onClose();
    onOpenAiImportModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={handleFinish}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Step Progress */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Welcome to Academic Workspace</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Step {currentStep} of 3
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Your minimalist, offline-first operating system for coursework and research
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFinish}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 rounded transition"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleFinish}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close Guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stepper Dots Bar */}
        <div className="grid grid-cols-3 border-b border-slate-100 dark:border-slate-800 text-[11px] font-medium bg-slate-50/30 dark:bg-slate-800/20">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`py-2 px-3 flex items-center justify-center gap-2 border-b-2 transition ${
              currentStep === 1
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center">
              1
            </span>
            <span>Workspace Mode</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className={`py-2 px-3 flex items-center justify-center gap-2 border-b-2 transition ${
              currentStep === 2
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center">
              2
            </span>
            <span>Import Timetable</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className={`py-2 px-3 flex items-center justify-center gap-2 border-b-2 transition ${
              currentStep === 3
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center">
              3
            </span>
            <span>Superpowers</span>
          </button>
        </div>

        {/* Modal Body / Step Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* STEP 1: CHOOSE WORKSPACE MODE */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Step 1: Choose Your Preferred Experience
                </h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                  Whether you are managing daily coursework and assignments, or working on major research projects, select your initial workspace setup. (You can customize individual views anytime in the <strong>Views</strong> menu).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {/* Mode Card 1: Student / Essentials Mode */}
                <div
                  onClick={() => handleSelectMode('basic')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    selectedMode === 'basic'
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      {selectedMode === 'basic' && (
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        Coursework & Student
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Focused 3-tab minimalist layout
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Daily Class Schedule & Hourly Timeline</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Weekly Timetable & Semester Week Matrix</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Tasks, Deadlines & Priority Archive</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-200/50 dark:border-slate-800 text-[10px] text-slate-400 font-mono">
                    Best for: Daily coursework, classes, and assignments
                  </div>
                </div>

                {/* Mode Card 2: Advanced & Projects Suite */}
                <div
                  onClick={() => handleSelectMode('research')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    selectedMode === 'research'
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      {selectedMode === 'research' && (
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        Advanced & Projects Suite
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Complete 8-view personal academic OS
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>All Student Essentials (Schedule, Matrix, Tasks)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Pipeline (Milestones, Projects & Stages)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Literature Matrix (Papers, BibTeX, Notes)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Advisor Meetings, Digests & Action Items</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Conference Deadlines & Experiment Runs</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-200/50 dark:border-slate-800 text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-medium">
                    Best for: Advanced coursework, thesis, projects & research
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SETUP TIMETABLE & AI IMPORT */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Step 2: Setup Your Classes & Timetable
                </h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                  Setting up a semester schedule manually can be tedious. You have 3 easy ways to populate your timetable:
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {/* Method 1: AI Importer (Hero) */}
                <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/40 dark:from-indigo-950/30 dark:via-slate-900 dark:to-purple-950/20 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                          <span>AI Timetable Importer</span>
                          <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono">
                            Recommended
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                          Take a photo of your paper timetable or syllabus PDF &rarr; Feed to ChatGPT/Claude/Gemini &rarr; Paste JSON here.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleLaunchAiImport}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs transition flex items-center gap-1.5 shrink-0"
                    >
                      <span>Open Importer</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 dark:text-slate-300">
                      Auto-detects course codes, meeting rooms, times, and odd/even weeks
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                      Under 10 Seconds
                    </span>
                  </div>
                </div>

                {/* Method 2: Template Courses */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white text-xs">
                        Explore with Sample Courses
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Your workspace currently includes sample courses (CS820, MATH701, etc.) ready to test.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                    Active
                  </span>
                </div>

                {/* Method 3: Manual Entry */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white text-xs">
                        Manual Customization
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Click <strong>"+ Add Course"</strong> or <strong>"Manage Terms"</strong> in the header anytime to add your own subjects.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: WORKSPACE SUPERPOWERS */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Step 3: Workspace Superpowers
                </h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                  Here are 4 built-in features that make this workspace unlike ordinary note apps:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Feature 1 */}
                <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Smartphone className="w-4 h-4" />
                    <span className="font-bold text-slate-900 dark:text-white">100% Offline PWA</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    Install to your desktop dock or mobile home screen. Operates with full offline persistence even in airplane mode.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <BellRing className="w-4 h-4" />
                    <span className="font-bold text-slate-900 dark:text-white">30m Class Reminders</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    Local system notifications 30m before lectures, plus 1-click sync with Apple Calendar and Google Calendar (.ics).
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Terminal className="w-4 h-4" />
                    <span className="font-bold text-slate-900 dark:text-white">Terminal 'phd' CLI</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    Type <code className="font-mono text-indigo-600 font-semibold">phd today</code> in your terminal to view today's schedule and tasks without opening a browser.
                  </p>
                </div>

                {/* Feature 4 */}
                <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Cloud className="w-4 h-4" />
                    <span className="font-bold text-slate-900 dark:text-white">Cloud Sync & Google Auth</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    Work without an account, or sign in with Google anytime to back up and sync with Cloudflare D1 across your laptop and phone.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between shrink-0">
          <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-500">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0 w-3.5 h-3.5"
            />
            <span>Don't show this guide on startup</span>
          </label>

          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3)}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs transition flex items-center gap-1.5"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs transition flex items-center gap-1.5"
              >
                <span>Enter Workspace</span>
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
