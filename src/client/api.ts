import {
  WorkspaceData,
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
  User,
} from '../types';
import { WorkspaceDatabase } from '../server/db';

const localDb = new WorkspaceDatabase();

const AUTH_TOKEN_KEY = 'phd_auth_token';

export function getStoredAuthToken(): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }
  return null;
}

export function setStoredAuthToken(token: string | null): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }
}

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getStoredAuthToken();
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Helper for safe JSON response parsing
async function parseJsonResponse<T>(res: Response): Promise<T | null> {
  if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
    try {
      return (await res.json()) as T;
    } catch (e) {}
  }
  return null;
}

export const api = {
  // Engine & Real-time Synchronization
  async getServerTime(): Promise<{ isoDate: string; timestamp: string; totalMinutes: number }> {
    try {
      const res = await fetch('/api/time', { headers: getAuthHeaders() });
      const data = await parseJsonResponse<any>(res);
      if (data?.isoDate) {
        return {
          isoDate: data.isoDate,
          timestamp: data.timestamp || new Date().toISOString(),
          totalMinutes: typeof data.totalMinutes === 'number' ? data.totalMinutes : data.hours * 60 + data.minutes,
        };
      }
    } catch (e) {}

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

  // Authentication
  async loginWithGoogle(
    credential: string,
    clientId?: string
  ): Promise<{ success: boolean; token?: string; user?: User; error?: string }> {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, clientId }),
      });
      const data = (await res.json()) as any;
      if (data.success && data.token) {
        setStoredAuthToken(data.token);
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error during Google sign-in' };
    }
  },

  async loginDemo(
    name = 'Student Scholar',
    email = 'scholar@academic.edu'
  ): Promise<{ success: boolean; token?: string; user?: User }> {
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = (await res.json()) as any;
      if (data.success && data.token) {
        setStoredAuthToken(data.token);
      }
      return data;
    } catch {
      return { success: false };
    }
  },

  async getAuthMe(): Promise<{ authenticated: boolean; user?: User }> {
    try {
      const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return { authenticated: false };
  },

  // Push Notifications
  async getVapidPublicKey(): Promise<string> {
    try {
      const res = await fetch('/api/notifications/vapid-public-key');
      const data = await parseJsonResponse<{ publicKey: string }>(res);
      if (data?.publicKey) return data.publicKey;
    } catch {}
    return 'BLJkRpNyveun6nsw3J-aQnHgkJ6zyoDoRJMB5wB01kUbRgGrcM5H4br47yIY2SMP0IauAGFPTvYhQMtp0517IMc';
  },

  async subscribePush(sub: PushSubscriptionJSON): Promise<boolean> {
    try {
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.keys,
          userAgent: navigator.userAgent,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async unsubscribePush(endpoint: string): Promise<boolean> {
    try {
      const res = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ endpoint }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async sendTestPush(subDirect?: PushSubscriptionJSON): Promise<{ success: boolean; sentCount?: number; error?: string }> {
    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(subDirect || {}),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to dispatch test notification' };
    }
  },

  // Semesters
  async getSemesters(): Promise<Semester[]> {
    try {
      const res = await fetch('/api/semesters', { headers: getAuthHeaders() });
      const data = await parseJsonResponse<Semester[]>(res);
      if (data && data.length > 0) return data;
    } catch (e) {}
    return localDb.getSemesters();
  },

  async saveSemester(sem: Semester): Promise<Semester> {
    try {
      const res = await fetch('/api/semesters', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(sem),
      });
      const data = await parseJsonResponse<Semester>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.saveSemester(sem);
  },

  async deleteSemester(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/semesters/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) return true;
    } catch (e) {}
    return localDb.deleteSemester(id);
  },

  // TimeSlots
  async getTimeSlots(): Promise<TimeSlot[]> {
    try {
      const res = await fetch('/api/timeslots', { headers: getAuthHeaders() });
      const data = await parseJsonResponse<TimeSlot[]>(res);
      if (data && data.length > 0) return data;
    } catch (e) {}
    return localDb.getTimeSlots();
  },

  async saveTimeSlots(slots: TimeSlot[]): Promise<TimeSlot[]> {
    try {
      const res = await fetch('/api/timeslots', {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
      const url = semId ? `/api/courses?semesterId=${encodeURIComponent(semId)}` : '/api/courses';
      const res = await fetch(url, { headers: getAuthHeaders() });
      const data = await parseJsonResponse<Course[]>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.getCourses(semId);
  },

  async saveCourse(course: Course): Promise<Course> {
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(course),
      });
      const data = await parseJsonResponse<Course>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.saveCourse(course);
  },

  async deleteCourse(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/courses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) return true;
    } catch (e) {}
    await localDb.deleteCourse(id);
    return true;
  },

  // Routines & Events
  async getEvents(semId?: string): Promise<ScheduleEvent[]> {
    try {
      const url = semId ? `/api/events?semesterId=${encodeURIComponent(semId)}` : '/api/events';
      const res = await fetch(url, { headers: getAuthHeaders() });
      const data = await parseJsonResponse<ScheduleEvent[]>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.getEvents(semId);
  },

  async saveEvent(event: ScheduleEvent): Promise<ScheduleEvent> {
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(event),
      });
      const data = await parseJsonResponse<ScheduleEvent>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.saveEvent(event);
  },

  async deleteEvent(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) return true;
    } catch (e) {}
    await localDb.deleteEvent(id);
    return true;
  },

  // Tasks
  async getTasks(semId?: string): Promise<Task[]> {
    try {
      const url = semId ? `/api/tasks?semesterId=${encodeURIComponent(semId)}` : '/api/tasks';
      const res = await fetch(url, { headers: getAuthHeaders() });
      const data = await parseJsonResponse<Task[]>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.getTasks(semId);
  },

  async saveTask(task: Task): Promise<Task> {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(task),
      });
      const data = await parseJsonResponse<Task>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.saveTask(task);
  },

  async deleteTask(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) return true;
    } catch (e) {}
    await localDb.deleteTask(id);
    return true;
  },

  // Kanban
  async getKanban(semId?: string): Promise<KanbanMilestone[]> {
    try {
      const url = semId ? `/api/kanban?semesterId=${encodeURIComponent(semId)}` : '/api/kanban';
      const res = await fetch(url, { headers: getAuthHeaders() });
      const data = await parseJsonResponse<KanbanMilestone[]>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.getKanban(semId);
  },

  async saveKanban(item: KanbanMilestone): Promise<KanbanMilestone> {
    try {
      const res = await fetch('/api/kanban', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(item),
      });
      const data = await parseJsonResponse<KanbanMilestone>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.saveKanban(item);
  },

  async deleteKanban(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/kanban/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) return true;
    } catch (e) {}
    await localDb.deleteKanban(id);
    return true;
  },

  // Papers
  async getPapers(): Promise<Paper[]> {
    try {
      const res = await fetch('/api/papers', { headers: getAuthHeaders() });
      const data = await parseJsonResponse<Paper[]>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.getPapers();
  },

  async savePaper(paper: Paper): Promise<Paper> {
    try {
      const res = await fetch('/api/papers', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(paper),
      });
      const data = await parseJsonResponse<Paper>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.savePaper(paper);
  },

  async deletePaper(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/papers/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) return true;
    } catch (e) {}
    return localDb.deletePaper(id);
  },

  // Conferences
  async getConferences(): Promise<Conference[]> {
    try {
      const res = await fetch('/api/conferences', { headers: getAuthHeaders() });
      const data = await parseJsonResponse<Conference[]>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.getConferences();
  },

  async saveConference(conf: Conference): Promise<Conference> {
    try {
      const res = await fetch('/api/conferences', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(conf),
      });
      const data = await parseJsonResponse<Conference>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.saveConference(conf);
  },

  async deleteConference(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/conferences/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) return true;
    } catch (e) {}
    return localDb.deleteConference(id);
  },

  // Experiments
  async getExperiments(): Promise<ExperimentLog[]> {
    try {
      const res = await fetch('/api/experiments', { headers: getAuthHeaders() });
      const data = await parseJsonResponse<ExperimentLog[]>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.getExperiments();
  },

  async saveExperiment(exp: ExperimentLog): Promise<ExperimentLog> {
    try {
      const res = await fetch('/api/experiments', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
      const res = await fetch('/api/meetings', { headers: getAuthHeaders() });
      const data = await parseJsonResponse<AdvisorMeeting[]>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.getMeetings();
  },

  async saveMeeting(m: AdvisorMeeting): Promise<AdvisorMeeting> {
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(m),
      });
      const data = await parseJsonResponse<AdvisorMeeting>(res);
      if (data) return data;
    } catch (e) {}
    return localDb.saveMeeting(m);
  },

  // Weekly Digest
  async getWeeklyDigest(): Promise<string> {
    try {
      const res = await fetch('/api/digest', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = (await res.json()) as { digest: string };
        return data.digest;
      }
    } catch (e) {}

    const tasks = await localDb.getTasks();
    const exps = await localDb.getExperiments();
    const done = tasks.filter((t) => t.status === 'completed');
    const pending = tasks.filter((t) => t.status !== 'completed');
    return [
      `# Academic Weekly Digest (${new Date().toISOString().split('T')[0]})`,
      '',
      '## 1. Accomplished This Week',
      done.length > 0 ? done.map((t) => `- [x] ${t.title} (${t.tags.join(', ')})`).join('\n') : '- No tasks completed.',
      '',
      '## 2. Experimental Milestones',
      exps.length > 0 ? exps.slice(0, 3).map((e) => `- **${e.name}**: ${e.notes || 'Finished'}`).join('\n') : '- No recent runs.',
      '',
      '## 3. Next Week Goals',
      pending.slice(0, 4).map((t) => `- [ ] ${t.title}`).join('\n') || '- Continue progress on upcoming assignments.',
      '',
      '---\n*Academic Workspace*',
    ].join('\n');
  },

  // Backup / Restore
  async exportBackup(): Promise<WorkspaceData> {
    try {
      const res = await fetch('/api/backup', { headers: getAuthHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {}
    return localDb.exportAll();
  },

  async restoreBackup(data: Partial<WorkspaceData>): Promise<void> {
    try {
      await fetch('/api/backup/restore', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
      });
    } catch (e) {}
    await localDb.importAll(data);
  },
};
