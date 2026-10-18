import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace, addDays, getTodayIsoDate } from './hooks/useWorkspace';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { MobileBottomNav } from './components/MobileBottomNav';

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
import { CourseDetailsModal } from './components/modals/CourseDetailsModal';
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
import { EventDetailsModal } from './components/modals/EventDetailsModal';
import { CustomizeViewsModal } from './components/modals/CustomizeViewsModal';
import { AttendanceLogModal } from './components/modals/AttendanceLogModal';
import { useAuth } from './hooks/useAuth';

import { Plus } from 'lucide-react';

import { Course, ScheduleEvent } from '../types';

export function App() {
  const auth = useAuth();
  const ws = useWorkspace(auth.user?.id);
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
  const [isAttendanceLogOpen, setIsAttendanceLogOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isWelcomeGuideOpen, setIsWelcomeGuideOpen] = useState(() => {
    return localStorage.getItem('phd_workspace_has_onboarded_v1') !== 'true';
  });

  // Notification-Triggered Preview Modals
  const [previewCourse, setPreviewCourse] = useState<Course | null>(null);
  const [previewEvent, setPreviewEvent] = useState<ScheduleEvent | null>(null);

  const isAnyModalOpen =
    !!previewCourse ||
    !!previewEvent ||
    isTaskModalOpen ||
    isCourseModalOpen ||
    isSemesterModalOpen ||
    isTimeSlotsModalOpen ||
    isPaperModalOpen ||
    isConferenceModalOpen ||
    isExperimentModalOpen ||
    isAdvisorMeetingModalOpen ||
    isDigestModalOpen ||
    isCliModalOpen ||
    isBackupModalOpen ||
    isKanbanModalOpen ||
    isAiImportModalOpen ||
    isRemindersModalOpen ||
    isCustomizeViewsOpen ||
    isAttendanceLogOpen ||
    isEventModalOpen ||
    isWelcomeGuideOpen ||
    auth.isAuthModalOpen;

  // Handler to open preview of a course, routine, or event triggered from a notification click
  const handleOpenPreview = useCallback(
    (type: string, id: string) => {
      if (!id) return;
      if (type === 'course') {
        const found = ws.courses.find((c) => c.id === id);
        if (found) {
          setPreviewCourse(found);
          ws.showToast(`Opening preview: ${found.code} - ${found.name} 📚`);
        }
      } else if (type === 'routine' || type === 'event') {
        const found = ws.events.find((e) => e.id === id);
        if (found) {
          setPreviewEvent(found);
          ws.showToast(`Opening preview: ${found.title} 📅`);
        }
      }
    },
    [ws.courses, ws.events, ws.showToast]
  );

  // Listen for Notification clicks across all surfaces (Service worker message, Window CustomEvent, URL query params)
  useEffect(() => {
    // 1. Check URL parameters on initial launch or navigation
    const searchParams = new URLSearchParams(window.location.search);
    const qType = searchParams.get('previewType');
    const qId = searchParams.get('previewId');
    if (qType && qId && (ws.courses.length > 0 || ws.events.length > 0)) {
      handleOpenPreview(qType, qId);
      // Clean query string from browser URL
      const cleanPath = window.location.pathname;
      window.history.replaceState({}, '', cleanPath);
    }

    // 2. Service Worker push / notificationclick message handler
    const handleSwMessage = (e: MessageEvent) => {
      if (e.data?.type === 'NOTIFICATION_PREVIEW_OPEN') {
        const { previewType, previewId } = e.data;
        if (previewType && previewId) {
          handleOpenPreview(previewType, previewId);
        }
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    // 3. Fallback window CustomEvent handler
    const handleCustomPreview = (e: Event) => {
      const custom = e as CustomEvent<{ previewType: string; previewId: string }>;
      if (custom.detail?.previewType && custom.detail?.previewId) {
        handleOpenPreview(custom.detail.previewType, custom.detail.previewId);
      }
    };
    window.addEventListener('academic-notification-preview', handleCustomPreview);

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
      window.removeEventListener('academic-notification-preview', handleCustomPreview);
    };
  }, [handleOpenPreview, ws.courses, ws.events]);

  // Desktop keyboard shortcuts: T (today), [ / ] (prev/next day), 1-5 (views), C (new task), ? (guide)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isAnyModalOpen) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        ws.setSelectedDate(getTodayIsoDate());
        ws.showToast('Jumped to Today 📅');
      } else if (e.key === '[') {
        e.preventDefault();
        ws.setSelectedDate((prev) => addDays(prev, -1));
      } else if (e.key === ']') {
        e.preventDefault();
        ws.setSelectedDate((prev) => addDays(prev, 1));
      } else if (e.key === '1') {
        e.preventDefault();
        ws.setActiveTab('timeline');
      } else if (e.key === '2') {
        e.preventDefault();
        ws.setActiveTab('courses');
      } else if (e.key === '3') {
        e.preventDefault();
        ws.setActiveTab('todo');
      } else if (e.key === '4') {
        e.preventDefault();
        ws.setActiveTab('kanban');
      } else if (e.key === '5') {
        e.preventDefault();
        ws.setActiveTab('papers');
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setIsTaskModalOpen(true);
      } else if (e.key === '?') {
        e.preventDefault();
        setIsWelcomeGuideOpen(true);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnyModalOpen, ws]);

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
        onOpenAttendanceLog={() => setIsAttendanceLogOpen(true)}
        isMobileDrawerOpen={isMobileDrawerOpen}
        onToggleMobileDrawer={setIsMobileDrawerOpen}
      />

      {/* Tabs Navigation */}
      <Navigation
        ws={ws}
        onOpenGuideModal={() => setIsWelcomeGuideOpen(true)}
        onOpenCustomizeViews={() => setIsCustomizeViewsOpen(true)}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-32 md:pb-24">
        {activeTab === 'timeline' && (
          <ScheduleTimelineView
            ws={ws}
            onOpenTaskModal={() => setIsTaskModalOpen(true)}
            onEditCourse={handleOpenEditCourse}
            onEditEvent={handleOpenEditEvent}
            onOpenEventModal={handleOpenAddEvent}
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

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        ws={ws}
        onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
      />

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsTaskModalOpen(true)}
        aria-label="Quick Add Task"
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+68px)] md:bottom-5 right-4 md:right-5 z-30 h-10 px-3.5 rounded-full bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-lg flex items-center gap-1.5 text-xs font-medium transition active:scale-95"
      >
        <Plus className="w-4 h-4" />
        <span>New Task</span>
      </button>

      {/* Dynamic Island Style Mobile & Desktop Toast Notification */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          onClick={() => ws.showToast('')}
          className="fixed top-[calc(env(safe-area-inset-top,0px)+12px)] sm:top-5 left-1/2 -translate-x-1/2 z-[99999] max-w-[92vw] sm:max-w-md w-max px-4 py-2.5 rounded-full bg-slate-900/95 dark:bg-slate-800/95 text-white shadow-2xl backdrop-blur-md border border-slate-700/60 dark:border-slate-600/60 flex items-center gap-2.5 text-xs font-medium tracking-tight animate-in fade-in slide-in-from-top-3 duration-200 select-none cursor-pointer active:scale-95 transition-transform"
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              toastMsg.toLowerCase().includes('error') || toastMsg.toLowerCase().includes('failed') || toastMsg.toLowerCase().includes('denied')
                ? 'bg-rose-400 shadow-xs shadow-rose-500 animate-pulse'
                : toastMsg.toLowerCase().includes('notice') || toastMsg.toLowerCase().includes('requires')
                ? 'bg-amber-400 shadow-xs shadow-amber-500'
                : 'bg-emerald-400 shadow-xs shadow-emerald-500'
            }`}
          />
          <span className="leading-snug break-words line-clamp-2">{toastMsg}</span>
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
      <AttendanceLogModal
        ws={ws}
        isOpen={isAttendanceLogOpen}
        onClose={() => setIsAttendanceLogOpen(false)}
      />

      {/* Global Notification Course Details Preview Modal */}
      <CourseDetailsModal
        course={previewCourse}
        isOpen={!!previewCourse}
        onClose={() => setPreviewCourse(null)}
        onEdit={(c) => {
          setPreviewCourse(null);
          handleOpenEditCourse(c);
        }}
        timeSlots={ws.timeSlots}
        currentAcademicWeek={ws.currentAcademicWeek}
        totalWeeks={ws.viewedSemester.totalWeeks}
        tasks={ws.tasks}
        selectedDate={ws.selectedDate}
        attendanceRecords={ws.attendanceRecords}
        getCourseAttendanceStats={ws.getCourseAttendanceStats}
        setAttendanceStatus={ws.setAttendanceStatus}
        getAttendanceRecord={ws.getAttendanceRecord}
      />

      {/* Global Notification Routine & Event Details Preview Modal */}
      <EventDetailsModal
        event={previewEvent}
        isOpen={!!previewEvent}
        onClose={() => setPreviewEvent(null)}
        onEdit={(ev) => {
          setPreviewEvent(null);
          handleOpenEditEvent(ev);
        }}
        onDelete={ws.deleteEvent}
        currentAcademicWeek={ws.currentAcademicWeek}
        selectedDate={ws.selectedDate}
        attendanceRecords={ws.attendanceRecords}
        getRoutineAttendanceStats={ws.getRoutineAttendanceStats}
        setAttendanceStatus={ws.setAttendanceStatus}
        getAttendanceRecord={ws.getAttendanceRecord}
      />
    </div>
  );
}
