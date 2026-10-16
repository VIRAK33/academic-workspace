import React, { useState } from 'react';
import { useWorkspace } from './hooks/useWorkspace';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';

// Views
import { ScheduleTimelineView } from './components/views/ScheduleTimelineView';
import { WeeklyTimetableMatrixView } from './components/views/WeeklyTimetableMatrixView';
import { TasksTodoView } from './components/views/TasksTodoView';
import { ResearchKanbanView } from './components/views/ResearchKanbanView';
import { LiteraturePapersView } from './components/views/LiteraturePapersView';
import { AdvisorMeetingsView } from './components/views/AdvisorMeetingsView';
import { ConferencesView } from './components/views/ConferencesView';
import { ExperimentLogsView } from './components/views/ExperimentLogsView';

// Modals
import { TaskModal } from './components/modals/TaskModal';
import { CourseModal } from './components/modals/CourseModal';
import { SemesterModal } from './components/modals/SemesterModal';
import { TimeSlotsModal } from './components/modals/TimeSlotsModal';
import { PaperModal } from './components/modals/PaperModal';
import { ConferenceModal } from './components/modals/ConferenceModal';
import { ExperimentModal } from './components/modals/ExperimentModal';
import { AdvisorMeetingModal } from './components/modals/AdvisorMeetingModal';
import { WeeklyDigestModal } from './components/modals/WeeklyDigestModal';
import { CliCheatSheetModal } from './components/modals/CliCheatSheetModal';
import { BackupModal } from './components/modals/BackupModal';
import { KanbanModal } from './components/modals/KanbanModal';
import { AuthModal } from './components/modals/AuthModal';
import { AiScheduleImportModal } from './components/modals/AiScheduleImportModal';
import { ClassRemindersModal } from './components/modals/ClassRemindersModal';
import { WelcomeGuideModal } from './components/modals/WelcomeGuideModal';
import { EventModal } from './components/modals/EventModal';
import { CustomizeViewsModal } from './components/modals/CustomizeViewsModal';
import { useAuth } from './hooks/useAuth';

import { Plus } from 'lucide-react';

import { Course, ScheduleEvent } from '../types';

export function App() {
  const ws = useWorkspace();
  const auth = useAuth();
  const { activeTab, toastMsg } = ws;

  // Modal open states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  const [isTimeSlotsModalOpen, setIsTimeSlotsModalOpen] = useState(false);
  const [isPaperModalOpen, setIsPaperModalOpen] = useState(false);
  const [isConferenceModalOpen, setIsConferenceModalOpen] = useState(false);
  const [isExperimentModalOpen, setIsExperimentModalOpen] = useState(false);
  const [isAdvisorMeetingModalOpen, setIsAdvisorMeetingModalOpen] = useState(false);
  const [isDigestModalOpen, setIsDigestModalOpen] = useState(false);
  const [isCliModalOpen, setIsCliModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isKanbanModalOpen, setIsKanbanModalOpen] = useState(false);
  const [isAiImportModalOpen, setIsAiImportModalOpen] = useState(false);
  const [isRemindersModalOpen, setIsRemindersModalOpen] = useState(false);
  const [isCustomizeViewsOpen, setIsCustomizeViewsOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [isWelcomeGuideOpen, setIsWelcomeGuideOpen] = useState(() => {
    return localStorage.getItem('phd_workspace_has_onboarded_v1') !== 'true';
  });

  const handleOpenAddCourse = () => {
    setEditingCourse(null);
    setIsCourseModalOpen(true);
  };

  const handleOpenEditCourse = (course: Course) => {
    setEditingCourse(course);
    setIsCourseModalOpen(true);
  };

  const handleCloseCourseModal = () => {
    setIsCourseModalOpen(false);
    setEditingCourse(null);
  };

  const handleOpenAddEvent = () => {
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleOpenEditEvent = (event: ScheduleEvent) => {
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };

  const handleCloseEventModal = () => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-slate-900 selection:text-white transition-colors">
      {/* Header */}
      <Header
        ws={ws}
        auth={auth}
        onOpenSemesterModal={() => setIsSemesterModalOpen(true)}
        onOpenTimeSlotsModal={() => setIsTimeSlotsModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenCliModal={() => setIsCliModalOpen(true)}
        onOpenAiImportModal={() => setIsAiImportModalOpen(true)}
        onOpenRemindersModal={() => setIsRemindersModalOpen(true)}
        onOpenGuideModal={() => setIsWelcomeGuideOpen(true)}
        onOpenCustomizeViews={() => setIsCustomizeViewsOpen(true)}
      />

      {/* Tabs Navigation */}
      <Navigation
        ws={ws}
        onOpenGuideModal={() => setIsWelcomeGuideOpen(true)}
        onOpenCustomizeViews={() => setIsCustomizeViewsOpen(true)}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-24">
        {activeTab === 'timeline' && (
          <ScheduleTimelineView
            ws={ws}
            onOpenTaskModal={() => setIsTaskModalOpen(true)}
            onEditCourse={handleOpenEditCourse}
            onEditEvent={handleOpenEditEvent}
          />
        )}

        {activeTab === 'courses' && (
          <WeeklyTimetableMatrixView
            ws={ws}
            onOpenCourseModal={handleOpenAddCourse}
            onOpenTimeSlotsModal={() => setIsTimeSlotsModalOpen(true)}
            onEditCourse={handleOpenEditCourse}
            onOpenEventModal={handleOpenAddEvent}
            onEditEvent={handleOpenEditEvent}
            onOpenAiImportModal={() => setIsAiImportModalOpen(true)}
            onOpenRemindersModal={() => setIsRemindersModalOpen(true)}
          />
        )}

        {activeTab === 'todo' && (
          <TasksTodoView
            ws={ws}
            onOpenTaskModal={() => setIsTaskModalOpen(true)}
          />
        )}

        {activeTab === 'kanban' && (
          <ResearchKanbanView
            ws={ws}
            onOpenKanbanModal={() => setIsKanbanModalOpen(true)}
          />
        )}

        {activeTab === 'papers' && (
          <LiteraturePapersView
            ws={ws}
            onOpenPaperModal={() => setIsPaperModalOpen(true)}
          />
        )}

        {activeTab === 'advisor' && (
          <AdvisorMeetingsView
            ws={ws}
            onOpenMeetingModal={() => setIsAdvisorMeetingModalOpen(true)}
            onOpenDigestModal={() => setIsDigestModalOpen(true)}
          />
        )}

        {activeTab === 'conferences' && (
          <ConferencesView
            ws={ws}
            onOpenConferenceModal={() => setIsConferenceModalOpen(true)}
          />
        )}

        {activeTab === 'experiments' && (
          <ExperimentLogsView
            ws={ws}
            onOpenExperimentModal={() => setIsExperimentModalOpen(true)}
          />
        )}
      </main>

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsTaskModalOpen(true)}
        aria-label="Quick Add Task"
        className="fixed bottom-5 right-5 z-40 h-10 px-3.5 rounded-full bg-slate-900 dark:bg-white hover:bg-slate-800 text-white dark:text-slate-900 shadow-lg flex items-center gap-1.5 text-xs font-medium transition"
      >
        <Plus className="w-4 h-4" />
        <span>New Task</span>
      </button>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium shadow-md flex items-center gap-2 animate-bounce">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dark:bg-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Modals */}
      <TaskModal ws={ws} isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} />
      <CourseModal
        ws={ws}
        isOpen={isCourseModalOpen}
        onClose={handleCloseCourseModal}
        editingCourse={editingCourse}
      />
      <EventModal
        ws={ws}
        isOpen={isEventModalOpen}
        onClose={handleCloseEventModal}
        initialEvent={editingEvent}
      />
      <SemesterModal
        ws={ws}
        isOpen={isSemesterModalOpen}
        onClose={() => setIsSemesterModalOpen(false)}
        onOpenAiImportModal={() => setIsAiImportModalOpen(true)}
      />
      <TimeSlotsModal ws={ws} isOpen={isTimeSlotsModalOpen} onClose={() => setIsTimeSlotsModalOpen(false)} />
      <PaperModal ws={ws} isOpen={isPaperModalOpen} onClose={() => setIsPaperModalOpen(false)} />
      <ConferenceModal ws={ws} isOpen={isConferenceModalOpen} onClose={() => setIsConferenceModalOpen(false)} />
      <ExperimentModal ws={ws} isOpen={isExperimentModalOpen} onClose={() => setIsExperimentModalOpen(false)} />
      <AdvisorMeetingModal ws={ws} isOpen={isAdvisorMeetingModalOpen} onClose={() => setIsAdvisorMeetingModalOpen(false)} />
      <WeeklyDigestModal ws={ws} isOpen={isDigestModalOpen} onClose={() => setIsDigestModalOpen(false)} />
      <CliCheatSheetModal ws={ws} isOpen={isCliModalOpen} onClose={() => setIsCliModalOpen(false)} />
      <BackupModal ws={ws} isOpen={isBackupModalOpen} onClose={() => setIsBackupModalOpen(false)} />
      <KanbanModal ws={ws} isOpen={isKanbanModalOpen} onClose={() => setIsKanbanModalOpen(false)} />
      {auth.isAuthModalOpen && <AuthModal auth={auth} onClose={auth.closeAuthModal} />}
      <AiScheduleImportModal
        ws={ws}
        isOpen={isAiImportModalOpen}
        onClose={() => setIsAiImportModalOpen(false)}
      />
      <ClassRemindersModal
        ws={ws}
        isOpen={isRemindersModalOpen}
        onClose={() => setIsRemindersModalOpen(false)}
      />
      <WelcomeGuideModal
        ws={ws}
        isOpen={isWelcomeGuideOpen}
        onClose={() => setIsWelcomeGuideOpen(false)}
        onOpenAiImportModal={() => setIsAiImportModalOpen(true)}
      />
      <CustomizeViewsModal
        ws={ws}
        isOpen={isCustomizeViewsOpen}
        onClose={() => setIsCustomizeViewsOpen(false)}
      />
    </div>
  );
}
