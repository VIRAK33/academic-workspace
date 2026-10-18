import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Semester,
  TimeSlot,
  Course,
  Task,
  KanbanMilestone,
  Paper,
  Conference,
  ExperimentLog,
  AdvisorMeeting,
  ScheduleEvent,
  AttendanceRecord,
  CommitmentStatus,
} from '../../types';
import { api } from '../api';
import { getNotificationSettings, checkUpcomingClassAlerts } from '../utils/notificationScheduler';


export type TabKey = 'timeline' | 'courses' | 'todo' | 'kanban' | 'papers' | 'advisor' | 'conferences' | 'experiments';

export type UserWorkspaceMode = 'basic' | 'research' | 'custom';

export const BASIC_TABS: TabKey[] = ['timeline', 'courses', 'todo'];
export const ALL_TABS: TabKey[] = [
  'timeline',
  'courses',
  'todo',
  'kanban',
  'papers',
  'advisor',
  'conferences',
  'experiments',
];

export const TAB_METADATA: Record<TabKey, { label: string; group: 'essentials' | 'research'; description: string }> = {
  timeline: { label: 'Schedule', group: 'essentials', description: 'Daily class timeline & hourly grid' },
  courses: { label: 'Timetable & Matrix', group: 'essentials', description: 'Weekly class schedule & semester week matrix' },
  todo: { label: 'Tasks', group: 'essentials', description: 'Action items, deadlines & task archive' },
  kanban: { label: 'Pipeline', group: 'research', description: 'Milestones, projects & assignment stages' },
  papers: { label: 'Literature Matrix', group: 'research', description: 'Reading notes, syntheses & paper summaries' },
  advisor: { label: 'Advisor Meetings', group: 'research', description: 'Agendas, action items & weekly digests' },
  conferences: { label: 'Conferences', group: 'research', description: 'Call-for-papers deadlines, tiers & submissions' },
  experiments: { label: 'Experiment Logs', group: 'research', description: 'Hypotheses, parameters & model findings' },
};

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function deduplicateTimeSlots(slots: TimeSlot[]): TimeSlot[] {
  const seen = new Set<string>();
  const res: TimeSlot[] = [];
  for (const s of slots) {
    if (!seen.has(s.session)) {
      seen.add(s.session);
      res.push(s);
    }
  }
  return res;
}

export function parseIsoDate(isoStr?: string): Date {
  const [y, m, d] = (isoStr || getTodayIsoDate()).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatIsoDate(dateUtc: Date): string {
  const y = dateUtc.getUTCFullYear();
  const m = String(dateUtc.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dateUtc.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(isoStr: string, deltaDays: number): string {
  const dt = parseIsoDate(isoStr);
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return formatIsoDate(dt);
}

export function calculateAcademicWeek(selectedIso: string, semesterStartIso: string): number {
  const sel = parseIsoDate(selectedIso);
  const start = parseIsoDate(semesterStartIso);
  const diffDays = Math.floor((sel.getTime() - start.getTime()) / 86400000);
  return Math.floor(diffDays / 7) + 1;
}

export function getIsoDayOfWeek(isoStr: string): number {
  const dt = parseIsoDate(isoStr);
  const jsDay = dt.getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}

export const DAY_NAMES_FULL = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAY_NAMES_SHORT = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatHumanDate(isoStr: string): string {
  const dt = parseIsoDate(isoStr);
  const dayOfWeek = getIsoDayOfWeek(isoStr);
  const month = MONTH_NAMES_SHORT[dt.getUTCMonth()];
  const dayNum = dt.getUTCDate();
  return `${DAY_NAMES_FULL[dayOfWeek]}, ${month} ${dayNum}`;
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = (hhmm || '08:00').split(':').map(Number);
  return h * 60 + m;
}

export function format12HourTime(mins: number, includeMinutes = true): string {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  if (!includeMinutes && m === 0) return `${h12} ${period}`;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function format24To12Range(startHHMM: string, endHHMM: string): string {
  return `${format12HourTime(timeToMinutes(startHHMM))} - ${format12HourTime(timeToMinutes(endHHMM))}`;
}

export function formatCourseDurationWeeks(weeks?: number[], totalWeeks?: number): string {
  if (!weeks || !Array.isArray(weeks) || weeks.length === 0) {
    return totalWeeks ? `W1-${totalWeeks}` : '';
  }
  const sorted = Array.from(new Set(weeks.map(Number).filter(n => !isNaN(n) && n > 0))).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return totalWeeks ? `W1-${totalWeeks}` : '';
  }

  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
    } else {
      ranges.push(start === prev ? `W${start}` : `W${start}-${prev}`);
      start = sorted[i];
      prev = sorted[i];
    }
  }
  ranges.push(start === prev ? `W${start}` : `W${start}-${prev}`);
  return ranges.join(', ');
}


export function useWorkspace(currentUserId?: string) {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [kanban, setKanban] = useState<KanbanMilestone[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [experimentLogs, setExperimentLogs] = useState<ExperimentLog[]>([]);
  const [advisorMeetings, setAdvisorMeetings] = useState<AdvisorMeeting[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // Timetable Matrix & Schedule filter preferences
  const [showRoutines, setShowRoutinesState] = useState<boolean>(() => {
    return localStorage.getItem('aw_matrix_show_routines') !== 'false';
  });
  const setShowRoutines = useCallback((val: boolean) => {
    setShowRoutinesState(val);
    localStorage.setItem('aw_matrix_show_routines', String(val));
  }, []);

  const [showEvents, setShowEventsState] = useState<boolean>(() => {
    return localStorage.getItem('aw_matrix_show_events') !== 'false';
  });
  const setShowEvents = useCallback((val: boolean) => {
    setShowEventsState(val);
    localStorage.setItem('aw_matrix_show_events', String(val));
  }, []);

  const [showWeekend, setShowWeekendState] = useState<boolean>(() => {
    return localStorage.getItem('aw_matrix_show_weekend') === 'true';
  });
  const setShowWeekend = useCallback((val: boolean) => {
    setShowWeekendState(val);
    localStorage.setItem('aw_matrix_show_weekend', String(val));
  }, []);

  const [scheduleStartHour, setScheduleStartHourState] = useState<number>(() => {
    const saved = localStorage.getItem('aw_schedule_start_hour');
    return saved ? Number(saved) : 8;
  });
  const setScheduleStartHour = useCallback((val: number) => {
    setScheduleStartHourState(val);
    localStorage.setItem('aw_schedule_start_hour', String(val));
  }, []);

  const [scheduleEndHour, setScheduleEndHourState] = useState<number>(() => {
    const saved = localStorage.getItem('aw_schedule_end_hour');
    return saved ? Number(saved) : 21.5;
  });
  const setScheduleEndHour = useCallback((val: number) => {
    setScheduleEndHourState(val);
    localStorage.setItem('aw_schedule_end_hour', String(val));
  }, []);

  const [viewedSemesterId, setViewedSemesterId] = useState<string>('sem_2026_fall');
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayIsoDate());
  const [activeTab, setActiveTab] = useState<TabKey>('timeline');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showInactiveCourses, setShowInactiveCourses] = useState<boolean>(true);

  // Toast messaging
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  }, []);

  // Workspace Mode (basic vs research vs custom) & Enabled Tabs
  const [workspaceMode, setWorkspaceModeState] = useState<UserWorkspaceMode>(() => {
    const saved = localStorage.getItem('phd_workspace_mode');
    if (saved === 'basic' || saved === 'research' || saved === 'custom') return saved;
    return 'research';
  });

  const [enabledTabs, setEnabledTabsState] = useState<TabKey[]>(() => {
    try {
      const saved = localStorage.getItem('phd_enabled_tabs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter((k: any) => ALL_TABS.includes(k));
          if (valid.length > 0) return valid;
        }
      }
    } catch (e) {}
    const savedMode = localStorage.getItem('phd_workspace_mode');
    return savedMode === 'basic' ? BASIC_TABS : ALL_TABS;
  });

  // Ensure active tab is always one of the enabled tabs
  useEffect(() => {
    if (!enabledTabs.includes(activeTab)) {
      setActiveTab(enabledTabs[0] || 'timeline');
    }
  }, [enabledTabs, activeTab]);

  const setWorkspaceMode = useCallback((mode: UserWorkspaceMode) => {
    setWorkspaceModeState(mode);
    localStorage.setItem('phd_workspace_mode', mode);
    if (mode === 'basic') {
      setEnabledTabsState(BASIC_TABS);
      localStorage.setItem('phd_enabled_tabs', JSON.stringify(BASIC_TABS));
      setActiveTab(prev => BASIC_TABS.includes(prev) ? prev : 'timeline');
      showToast('Switched to Basic Student Mode (3 views)');
    } else if (mode === 'research') {
      setEnabledTabsState(ALL_TABS);
      localStorage.setItem('phd_enabled_tabs', JSON.stringify(ALL_TABS));
      showToast('Switched to Advanced Mode (All 8 views)');
    }
  }, [showToast]);

  const toggleTabVisibility = useCallback((tab: TabKey) => {
    setEnabledTabsState(prev => {
      let next: TabKey[];
      if (prev.includes(tab)) {
        if (prev.length <= 1) {
          showToast('At least one view must remain visible');
          return prev;
        }
        next = prev.filter(t => t !== tab);
      } else {
        next = ALL_TABS.filter(t => prev.includes(t) || t === tab);
      }

      let newMode: UserWorkspaceMode = 'custom';
      if (next.length === ALL_TABS.length) newMode = 'research';
      else if (next.length === BASIC_TABS.length && BASIC_TABS.every(t => next.includes(t))) newMode = 'basic';

      setWorkspaceModeState(newMode);
      localStorage.setItem('phd_workspace_mode', newMode);
      localStorage.setItem('phd_enabled_tabs', JSON.stringify(next));

      setActiveTab(curr => next.includes(curr) ? curr : next[0]);
      return next;
    });
  }, [showToast]);

  // Real-time vs simulated time (default to live real-time engine clock)
  const [isLiveClock, setIsLiveClock] = useState<boolean>(true);
  const [simulatedMinutes, setSimulatedMinutes] = useState<number>(() => getCurrentMinutes());

  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('phd_theme') === 'dark';
  });

  // Sync dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('phd_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('phd_theme', 'light');
    }
  }, [isDarkMode]);

  // Live clock interval (updates every second to track accurate live minutes)
  useEffect(() => {
    if (!isLiveClock) return;
    const updateNow = () => {
      const now = new Date();
      setSimulatedMinutes(now.getHours() * 60 + now.getMinutes());
    };
    updateNow();
    const interval = setInterval(updateNow, 1000);
    return () => clearInterval(interval);
  }, [isLiveClock]);

  // Initial load
  const loadData = useCallback(async () => {
    const [sems, slots, crs, tks, kb, pps, confs, exps, mtgs, evts, engineTime, atts] = await Promise.all([
      api.getSemesters(),
      api.getTimeSlots(),
      api.getCourses(),
      api.getTasks(),
      api.getKanban(),
      api.getPapers(),
      api.getConferences(),
      api.getExperiments(),
      api.getMeetings(),
      api.getEvents(),
      api.getServerTime(),
      api.getAttendanceRecords(),
    ]);
    setSemesters(sems || []);
    setTimeSlots(deduplicateTimeSlots(slots || []));
    setCourses(crs || []);
    setTasks(tks || []);
    setKanban(kb || []);
    setPapers(pps || []);
    setConferences(confs || []);
    setExperimentLogs(exps || []);
    setAdvisorMeetings(mtgs || []);
    setEvents(evts || []);
    setAttendanceRecords(atts || []);

    const active = sems?.find(s => s.isActive) || sems?.[0];
    if (active) setViewedSemesterId(active.id);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, currentUserId]);

  const loadSampleData = useCallback(async () => {
    const ok = await api.loadSampleData();
    if (ok) {
      await loadData();
      showToast('Loaded sample data successfully');
    } else {
      showToast('Please sign in to load sample data into your account');
    }
    return ok;
  }, [loadData, showToast]);

  const clearWorkspace = useCallback(async () => {
    const ok = await api.clearWorkspace();
    if (ok) {
      await loadData();
      showToast('Cleared workspace data');
    } else {
      showToast('Failed to clear workspace');
    }
    return ok;
  }, [loadData, showToast]);

  const viewedSemester = useMemo(() => {
    return semesters.find(s => s.id === viewedSemesterId) || semesters[0] || {
      id: 'sem_2026_fall',
      name: '2026-2027 Fall',
      startDate: '2026-09-14',
      totalWeeks: 19,
      isActive: true,
      isArchived: false,
    };
  }, [semesters, viewedSemesterId]);

  const currentAcademicWeek = useMemo(() => {
    return calculateAcademicWeek(selectedDate, viewedSemester.startDate);
  }, [selectedDate, viewedSemester]);

  // Periodic Local Class & Event Alert Checker (30m / 10m / Start)
  useEffect(() => {
    const runCheck = () => {
      const settings = getNotificationSettings();
      if (settings.enabled || (!isLiveClock && settings.notifyInSimulation !== false)) {
        checkUpcomingClassAlerts(courses, viewedSemester, currentAcademicWeek, settings, events, {
          simulatedMinutes: !isLiveClock ? simulatedMinutes : undefined,
          isSimulation: !isLiveClock,
          simulatedDate: selectedDate,
        });
      }
    };

    // Check immediately on data/time change
    runCheck();

    // Check every 30s in live mode, or every 3s in simulation mode
    const interval = setInterval(runCheck, isLiveClock ? 30000 : 3000);

    // Also check whenever tab becomes active
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        runCheck();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [courses, viewedSemester, currentAcademicWeek, events, isLiveClock, simulatedMinutes, selectedDate]);

  // Course actions
  const saveCourse = useCallback(async (course: Course) => {
    // 1. Optimistically update local React state immediately so UI updates with 0ms lag
    setCourses(prev => {
      const idx = prev.findIndex(c => c.id === course.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...course };
        return next;
      }
      return [...prev, { ...course }];
    });

    // 2. Persist to API / localDb
    const saved = await api.saveCourse(course);

    // 3. Ensure updated clone reference is set
    setCourses(prev => {
      const idx = prev.findIndex(c => c.id === saved.id || c.id === course.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...saved };
        return next;
      }
      return [...prev, { ...saved }];
    });
    showToast(`Saved course: ${course.code}`);
    return saved;
  }, [showToast]);

  const deleteCourse = useCallback(async (id: string) => {
    setCourses(prev => prev.filter(c => c.id !== id));
    await api.deleteCourse(id);
    showToast('Course deleted');
  }, [showToast]);

  // Task actions
  const saveTask = useCallback(async (task: Task) => {
    const toSave = { ...task };
    if (toSave.status === 'completed' && !toSave.completedAt) {
      toSave.completedAt = new Date().toISOString();
    }
    // Optimistic update
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === toSave.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...toSave };
        return next;
      }
      return [{ ...toSave }, ...prev];
    });

    const saved = await api.saveTask(toSave);
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === saved.id || t.id === toSave.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...saved };
        return next;
      }
      return [{ ...saved }, ...prev];
    });
    showToast('Task saved');
    return saved;
  }, [showToast]);

  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await api.deleteTask(id);
    showToast('Task deleted');
  }, [showToast]);

  const archiveTask = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const updated: Task = {
      ...task,
      status: 'archived',
      archivedAt: new Date().toISOString(),
    };
    await api.saveTask(updated);
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
    showToast('Task moved to archive');
  }, [tasks, showToast]);

  const unarchiveTask = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const updated: Task = {
      ...task,
      status: 'in_progress',
      archivedAt: undefined,
    };
    await api.saveTask(updated);
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
    showToast('Task restored from archive');
  }, [tasks, showToast]);

  const archiveAllCompleted = useCallback(async () => {
    const completedList = tasks.filter(t => t.status === 'completed');
    if (completedList.length === 0) return;

    const nowIso = new Date().toISOString();
    const updatedList = await Promise.all(
      completedList.map(t => api.saveTask({ ...t, status: 'archived', archivedAt: nowIso }))
    );

    setTasks(prev => {
      const updatedMap = new Map(updatedList.map(u => [u.id, u]));
      return prev.map(t => updatedMap.get(t.id) || t);
    });
    showToast(`Archived ${completedList.length} completed task${completedList.length > 1 ? 's' : ''}`);
  }, [tasks, showToast]);

  // Kanban actions
  const saveKanban = useCallback(async (item: KanbanMilestone) => {
    const saved = await api.saveKanban(item);
    setKanban(prev => {
      const idx = prev.findIndex(k => k.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    showToast('Milestone updated');
  }, [showToast]);

  const deleteKanban = useCallback(async (id: string) => {
    await api.deleteKanban(id);
    setKanban(prev => prev.filter(k => k.id !== id));
    showToast('Milestone removed');
  }, [showToast]);

  // Paper actions
  const savePaper = useCallback(async (paper: Paper) => {
    const saved = await api.savePaper(paper);
    setPapers(prev => {
      const idx = prev.findIndex(p => p.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    showToast(`Saved paper: ${paper.title.slice(0, 30)}...`);
  }, [showToast]);

  const deletePaper = useCallback(async (id: string) => {
    await api.deletePaper(id);
    setPapers(prev => prev.filter(p => p.id !== id));
    showToast('Paper removed');
  }, [showToast]);

  // Conference actions
  const saveConference = useCallback(async (conf: Conference) => {
    const saved = await api.saveConference(conf);
    setConferences(prev => {
      const idx = prev.findIndex(c => c.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    showToast(`Saved conference: ${conf.acronym}`);
  }, [showToast]);

  const deleteConference = useCallback(async (id: string) => {
    await api.deleteConference(id);
    setConferences(prev => prev.filter(c => c.id !== id));
    showToast('Conference removed');
  }, [showToast]);

  // Advisor Meeting actions
  const saveMeeting = useCallback(async (m: AdvisorMeeting) => {
    const saved = await api.saveMeeting(m);
    setAdvisorMeetings(prev => {
      const idx = prev.findIndex(item => item.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    showToast('Saved meeting log');
  }, [showToast]);

  // Experiment actions
  const saveExperiment = useCallback(async (exp: ExperimentLog) => {
    const saved = await api.saveExperiment(exp);
    setExperimentLogs(prev => {
      const idx = prev.findIndex(e => e.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    showToast(`Logged run: ${exp.name}`);
  }, [showToast]);

  // Event & Routine actions
  const saveEvent = useCallback(async (event: ScheduleEvent) => {
    // 1. Optimistic update
    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === event.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...event };
        return next;
      }
      return [...prev, { ...event }];
    });

    const saved = await api.saveEvent(event);
    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === saved.id || e.id === event.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...saved };
        return next;
      }
      return [...prev, { ...saved }];
    });
    showToast(`Saved ${event.type === 'routine' ? 'routine' : 'event'}: "${event.title}"`);
    return saved;
  }, [showToast]);

  const deleteEvent = useCallback(async (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    await api.deleteEvent(id);
    showToast('Removed commitment');
  }, [showToast]);

  // Semester actions
  const saveSemester = useCallback(async (sem: Semester) => {
    const saved = await api.saveSemester(sem);
    await loadData();
    setViewedSemesterId(saved.id);
    showToast(`Term: ${saved.name}`);
  }, [loadData, showToast]);

  const deleteSemester = useCallback(async (id: string) => {
    if (semesters.length <= 1) {
      showToast('Cannot delete the only academic term.');
      return false;
    }
    await api.deleteSemester(id);
    await loadData();
    if (viewedSemesterId === id) {
      const remaining = semesters.filter(s => s.id !== id);
      const nextActive = remaining.find(s => s.isActive) || remaining[0];
      if (nextActive) setViewedSemesterId(nextActive.id);
    }
    showToast('Academic term deleted');
    return true;
  }, [semesters, viewedSemesterId, loadData, showToast]);

  // Time slot actions
  const saveTimeSlots = useCallback(async (slots: TimeSlot[]) => {
    const saved = await api.saveTimeSlots(slots);
    setTimeSlots(deduplicateTimeSlots(saved));
    showToast('Session slots updated');
  }, [showToast]);

  // --- Attendance & Routine Records Actions ---
  const saveAttendanceRecord = useCallback(async (record: AttendanceRecord) => {
    setAttendanceRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === record.id || (r.targetId === record.targetId && r.date === record.date));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...record };
        return next;
      }
      return [record, ...prev];
    });
    const saved = await api.saveAttendanceRecord(record);
    return saved;
  }, []);

  const deleteAttendanceRecord = useCallback(async (id: string) => {
    setAttendanceRecords((prev) => prev.filter((r) => r.id !== id));
    await api.deleteAttendanceRecord(id);
  }, []);

  const getAttendanceRecord = useCallback(
    (targetId: string, date: string): AttendanceRecord | undefined => {
      return attendanceRecords.find((r) => r.targetId === targetId && r.date === date);
    },
    [attendanceRecords]
  );

  const setAttendanceStatus = useCallback(
    async (
      targetId: string,
      targetType: 'course' | 'routine' | 'event',
      date: string,
      status: CommitmentStatus | null,
      note?: string,
      academicWeek?: number
    ) => {
      const existing = attendanceRecords.find((r) => r.targetId === targetId && r.date === date);
      if (!status) {
        if (existing) {
          await deleteAttendanceRecord(existing.id);
          showToast('Attendance status cleared');
        }
        return;
      }

      const record: AttendanceRecord = {
        id: existing ? existing.id : `att_${targetType}_${targetId}_${date}`,
        targetId,
        targetType,
        date,
        status,
        academicWeek: academicWeek !== undefined ? academicWeek : existing?.academicWeek,
        note: note !== undefined ? note : existing?.note,
        updatedAt: new Date().toISOString(),
      };

      await saveAttendanceRecord(record);
      const label = status === 'attended' ? 'Attended ✓' : status === 'missed' ? 'Missed ✕' : 'Excused —';
      showToast(`Marked as ${label}`);
    },
    [attendanceRecords, deleteAttendanceRecord, saveAttendanceRecord, showToast]
  );

  const toggleAttendance = useCallback(
    async (
      targetId: string,
      targetType: 'course' | 'routine' | 'event',
      date: string,
      academicWeek?: number
    ) => {
      const existing = attendanceRecords.find((r) => r.targetId === targetId && r.date === date);
      let nextStatus: CommitmentStatus | null = 'attended';
      if (!existing) {
        nextStatus = 'attended';
      } else if (existing.status === 'attended') {
        nextStatus = 'missed';
      } else if (existing.status === 'missed') {
        nextStatus = 'excused';
      } else if (existing.status === 'excused') {
        nextStatus = null;
      }
      await setAttendanceStatus(targetId, targetType, date, nextStatus, undefined, academicWeek);
    },
    [attendanceRecords, setAttendanceStatus]
  );

  // Statistics calculation for Course Attendance
  const getCourseAttendanceStats = useCallback(
    (courseId: string) => {
      const targetCourse = courses.find((c) => c.id === courseId);
      if (!targetCourse) {
        return { totalEvaluated: 0, attended: 0, missed: 0, excused: 0, ratePercent: 100, records: [] };
      }

      const records = attendanceRecords.filter((r) => r.targetId === courseId);
      const attended = records.filter((r) => r.status === 'attended').length;
      const missed = records.filter((r) => r.status === 'missed').length;
      const excused = records.filter((r) => r.status === 'excused').length;
      const evaluated = attended + missed;
      const ratePercent = evaluated > 0 ? Math.round((attended / evaluated) * 100) : 100;

      return {
        totalEvaluated: evaluated,
        attended,
        missed,
        excused,
        ratePercent,
        records,
      };
    },
    [courses, attendanceRecords]
  );

  // Statistics calculation for Routine Completion
  const getRoutineAttendanceStats = useCallback(
    (routineId: string) => {
      const records = attendanceRecords.filter((r) => r.targetId === routineId);
      const attended = records.filter((r) => r.status === 'attended').length;
      const missed = records.filter((r) => r.status === 'missed').length;
      const excused = records.filter((r) => r.status === 'excused').length;
      const evaluated = attended + missed;
      const ratePercent = evaluated > 0 ? Math.round((attended / evaluated) * 100) : 100;

      return {
        totalEvaluated: evaluated,
        attended,
        missed,
        excused,
        ratePercent,
        records,
      };
    },
    [attendanceRecords]
  );

  return {
    semesters,
    timeSlots,
    courses,
    events,
    tasks,
    kanban,
    papers,
    conferences,
    experimentLogs,
    advisorMeetings,
    viewedSemester,
    viewedSemesterId,
    setViewedSemesterId,
    selectedDate,
    setSelectedDate,
    todayIsoDate: getTodayIsoDate(),
    currentAcademicWeek,
    activeTab,
    setActiveTab,
    workspaceMode,
    setWorkspaceMode,
    enabledTabs,
    toggleTabVisibility,
    showRoutines,
    setShowRoutines,
    showEvents,
    setShowEvents,
    showWeekend,
    setShowWeekend,
    scheduleStartHour,
    setScheduleStartHour,
    scheduleEndHour,
    setScheduleEndHour,
    searchQuery,
    setSearchQuery,
    showInactiveCourses,
    setShowInactiveCourses,
    isLiveClock,
    setIsLiveClock,
    simulatedMinutes,
    setSimulatedMinutes,
    isDarkMode,
    setIsDarkMode,
    toastMsg,
    showToast,
    saveCourse,
    deleteCourse,
    saveEvent,
    deleteEvent,
    saveTask,
    deleteTask,
    archiveTask,
    unarchiveTask,
    archiveAllCompleted,
    saveKanban,
    deleteKanban,
    savePaper,
    deletePaper,
    saveConference,
    deleteConference,
    saveMeeting,
    saveExperiment,
    saveSemester,
    deleteSemester,
    saveTimeSlots,
    attendanceRecords,
    saveAttendanceRecord,
    deleteAttendanceRecord,
    getAttendanceRecord,
    setAttendanceStatus,
    toggleAttendance,
    getCourseAttendanceStats,
    getRoutineAttendanceStats,
    loadSampleData,
    clearWorkspace,
    refreshData: loadData,
  };
}
