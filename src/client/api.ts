import { WorkspaceData, Semester, TimeSlot, Course, Task, KanbanMilestone, Paper, Conference, ExperimentLog, AdvisorMeeting, ScheduleEvent } from '../types';
import { WorkspaceDatabase } from '../server/db';

const localDb = new WorkspaceDatabase();

// In local browser mode or when server is available, api calls are seamless
export const api = {
  // Semesters
  async getSemesters(): Promise<Semester[]> {
    try {
      const res = await fetch('/api/semesters');
      if (res.ok) return await res.json();
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
      if (res.ok) return await res.json();
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
      if (res.ok) return await res.json();
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
      if (res.ok) return await res.json();
    } catch (e) {}
    return localDb.saveTimeSlots(slots);
  },

  // Courses
  async getCourses(semId?: string): Promise<Course[]> {
    try {
      const res = await fetch(`/api/courses${semId ? `?semesterId=${semId}` : ''}`);
      if (res.ok) return await res.json();
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
      if (res.ok) return await res.json();
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
      if (res.ok) return await res.json();
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
      if (res.ok) return await res.json();
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
      if (res.ok) return await res.json();
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
      if (res.ok) return await res.json();
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
      if (res.ok) return await res.json();
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
      if (res.ok) return await res.json();
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
      if (res.ok) return await res.json();
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
      if (res.ok) return await res.json();
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
      if (res.ok) return await res.json();
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
      if (res.ok) return await res.json();
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
      if (res.ok) return await res.json();
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
      if (res.ok) return await res.json();
    } catch (e) {}
    return localDb.saveExperiment(exp);
  },

  // Advisor Meetings
  async getMeetings(): Promise<AdvisorMeeting[]> {
    try {
      const res = await fetch('/api/meetings');
      if (res.ok) return await res.json();
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
      if (res.ok) return await res.json();
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
