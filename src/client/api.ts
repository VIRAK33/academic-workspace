import { WorkspaceData, Semester, TimeSlot, Course, Task, KanbanMilestone, Paper, Conference, ExperimentLog, AdvisorMeeting, ScheduleEvent } from '../types';
import { WorkspaceDatabase } from '../server/db';

const localDb = new WorkspaceDatabase();

// Helper for safe JSON response parsing
async function parseJsonResponse<T>(res: Response): Promise<T | null> {
  if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
    try {
      return (await res.json()) as T;
    } catch (e) {}
  }
  return null;
}

// In local browser mode or when server is available, api calls are seamless
export const api = {
  // Engine & Real-time Synchronization
  async getServerTime(): Promise<{ isoDate: string; timestamp: string; totalMinutes: number }> {
    try {
      const res = await fetch('/api/time');
      const data = await parseJsonResponse<any>(res);
      if (data?.isoDate) {
        return {
          isoDate: data.isoDate,
          timestamp: data.timestamp || new Date().toISOString(),
          totalMinutes: typeof data.totalMinutes === 'number' ? data.totalMinutes : (data.hours * 60 + data.minutes),
        };
      }
    } catch (e) {}

    // Fallback to local runtime engine time
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return {
      isoDate: `${y}-${m}-${d}`,
      timestamp: now.toISOString(),
      totalMinutes: now.getHours() * 60 + now.getMinutes(),
    };
  },

  // Semesters
  async getSemesters(): Promise<Semester[]> {
    try {
      const res = await fetch('/api/semesters');
      const data = await parseJsonResponse<Semester[]>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.getSemesters();
  },

  async saveSemester(sem: Semester): Promise<Semester> {
    try {
      const res = await fetch('/api/semesters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sem),
      });
      const data = await parseJsonResponse<Semester>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.saveSemester(sem);
  },

  async deleteSemester(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/semesters/${id}`, { method: 'DELETE' });
      if (res.ok) return true;
    } catch (e) {}
    return localDb.deleteSemester(id);
  },

  // TimeSlots
  async getTimeSlots(): Promise<TimeSlot[]> {
    try {
      const res = await fetch('/api/timeslots');
      const data = await parseJsonResponse<TimeSlot[]>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.getTimeSlots();
  },

  async saveTimeSlots(slots: TimeSlot[]): Promise<TimeSlot[]> {
    try {
      const res = await fetch('/api/timeslots', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slots),
      });
      const data = await parseJsonResponse<TimeSlot[]>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.saveTimeSlots(slots);
  },

  // Courses
  async getCourses(semId?: string): Promise<Course[]> {
    try {
      const res = await fetch(`/api/courses${semId ? `?semesterId=${semId}` : ''}`);
      const data = await parseJsonResponse<Course[]>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.getCourses(semId);
  },

  async saveCourse(course: Course): Promise<Course> {
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(course),
      });
      const data = await parseJsonResponse<Course>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.saveCourse(course);
  },

  async deleteCourse(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' });
      if (res.ok) return true;
    } catch (e) {}
    return localDb.deleteCourse(id);
  },

  // Events & Routines
  async getEvents(semId?: string): Promise<ScheduleEvent[]> {
    try {
      const res = await fetch(`/api/events${semId ? `?semesterId=${semId}` : ''}`);
      const data = await parseJsonResponse<ScheduleEvent[]>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.getEvents(semId);
  },

  async saveEvent(event: ScheduleEvent): Promise<ScheduleEvent> {
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
      const data = await parseJsonResponse<ScheduleEvent>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.saveEvent(event);
  },

  async deleteEvent(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      if (res.ok) return true;
    } catch (e) {}
    await localDb.deleteEvent(id);
    return true;
  },

  // Tasks
  async getTasks(semId?: string): Promise<Task[]> {
    try {
      const res = await fetch(`/api/tasks${semId ? `?semesterId=${semId}` : ''}`);
      const data = await parseJsonResponse<Task[]>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.getTasks(semId);
  },

  async saveTask(task: Task): Promise<Task> {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      const data = await parseJsonResponse<Task>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.saveTask(task);
  },

  async deleteTask(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) return true;
    } catch (e) {}
    return localDb.deleteTask(id);
  },

  // Kanban
  async getKanban(): Promise<KanbanMilestone[]> {
    try {
      const res = await fetch('/api/kanban');
      const data = await parseJsonResponse<KanbanMilestone[]>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.getKanban();
  },

  async saveKanban(item: KanbanMilestone): Promise<KanbanMilestone> {
    try {
      const res = await fetch('/api/kanban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      const data = await parseJsonResponse<KanbanMilestone>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.saveKanban(item);
  },

  async deleteKanban(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/kanban/${id}`, { method: 'DELETE' });
      if (res.ok) return true;
    } catch (e) {}
    return localDb.deleteKanban(id);
  },

  // Papers (Literature)
  async getPapers(): Promise<Paper[]> {
    try {
      const res = await fetch('/api/papers');
      const data = await parseJsonResponse<Paper[]>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.getPapers();
  },

  async savePaper(paper: Paper): Promise<Paper> {
    try {
      const res = await fetch('/api/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paper),
      });
      const data = await parseJsonResponse<Paper>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.savePaper(paper);
  },

  async deletePaper(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/papers/${id}`, { method: 'DELETE' });
      if (res.ok) return true;
    } catch (e) {}
    return localDb.deletePaper(id);
  },

  // Conferences
  async getConferences(): Promise<Conference[]> {
    try {
      const res = await fetch('/api/conferences');
      const data = await parseJsonResponse<Conference[]>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.getConferences();
  },

  async saveConference(conf: Conference): Promise<Conference> {
    try {
      const res = await fetch('/api/conferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conf),
      });
      const data = await parseJsonResponse<Conference>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.saveConference(conf);
  },

  async deleteConference(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/conferences/${id}`, { method: 'DELETE' });
      if (res.ok) return true;
    } catch (e) {}
    return localDb.deleteConference(id);
  },

  // Experiments
  async getExperiments(): Promise<ExperimentLog[]> {
    try {
      const res = await fetch('/api/experiments');
      const data = await parseJsonResponse<ExperimentLog[]>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.getExperiments();
  },

  async saveExperiment(exp: ExperimentLog): Promise<ExperimentLog> {
    try {
      const res = await fetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exp),
      });
      const data = await parseJsonResponse<ExperimentLog>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.saveExperiment(exp);
  },

  // Advisor Meetings
  async getMeetings(): Promise<AdvisorMeeting[]> {
    try {
      const res = await fetch('/api/meetings');
      const data = await parseJsonResponse<AdvisorMeeting[]>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.getMeetings();
  },

  async saveMeeting(m: AdvisorMeeting): Promise<AdvisorMeeting> {
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(m),
      });
      const data = await parseJsonResponse<AdvisorMeeting>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.saveMeeting(m);
  },

  // Generate Weekly Digest
  async getWeeklyDigest(): Promise<string> {
    try {
      const res = await fetch('/api/digest');
      if (res.ok) {
        const data = (await res.json()) as { digest: string };
        return data.digest;
      }
    } catch (e) {}
    // Client fallback
    const tasks = await localDb.getTasks();
    const exps = await localDb.getExperiments();
    const done = tasks.filter(t => t.status === 'completed');
    const pending = tasks.filter(t => t.status !== 'completed');
    return [
      `# Academic Weekly Digest (${new Date().toISOString().split('T')[0]})`,
      '',
      '## 1. Accomplished This Week',
      done.length > 0 ? done.map(t => `- [x] ${t.title} (${t.tags.join(', ')})`).join('\n') : '- No tasks completed.',
      '',
      '## 2. Experimental Milestones',
      exps.length > 0 ? exps.slice(0, 3).map(e => `- **${e.name}**: ${e.notes || 'Finished'}`).join('\n') : '- No recent runs.',
      '',
      '## 3. Next Week Goals',
      pending.slice(0, 4).map(t => `- [ ] ${t.title}`).join('\n') || '- Continue progress on upcoming assignments.',
      '',
      '---\n*Academic Workspace*'
    ].join('\n');
  },

  // Backup / Restore
  async exportBackup(): Promise<WorkspaceData> {
    try {
      const res = await fetch('/api/backup');
      if (res.ok) return await res.json();
    } catch (e) {}
    return localDb.exportAll();
  },

  async restoreBackup(data: Partial<WorkspaceData>): Promise<void> {
    try {
      await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (e) {}
    await localDb.importAll(data);
  }
};
