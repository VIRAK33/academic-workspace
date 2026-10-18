import {
  WorkspaceData,
  Task,
  Course,
  Semester,
  TimeSlot,
  KanbanMilestone,
  Paper,
  Conference,
  ExperimentLog,
  AdvisorMeeting,
  ScheduleEvent,
  User,
  PushSubscriptionRecord,
  AttendanceRecord,
  CommitmentStatus,
} from '../types';
import { defaultWorkspaceData } from './defaultData';

export interface DatabaseEnv {
  DB?: D1Database;
  ACADEMIC_STORAGE?: R2Bucket;
}

// In-memory / localStorage fallback store for local development, CLI & offline PWA
const OFFLINE_STORAGE_KEY = 'phd_workspace_offline_v1';

export function createEmptyWorkspaceData(): WorkspaceData {
  return {
    semesters: [],
    timeSlots: defaultWorkspaceData.timeSlots,
    courses: [],
    events: [],
    tasks: [],
    kanban: [],
    papers: [],
    conferences: [],
    experimentLogs: [],
    advisorMeetings: [],
    attendanceRecords: [],
  };
}

function initMemoryStore(): WorkspaceData {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.semesters) && Array.isArray(parsed.courses) && Array.isArray(parsed.tasks)) {
          if (!parsed.events) parsed.events = [];
          if (!parsed.attendanceRecords) parsed.attendanceRecords = [];
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read offline workspace storage:', e);
    }
  }
  return createEmptyWorkspaceData();
}

let memoryStore: WorkspaceData = initMemoryStore();

export function syncMemoryStore() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(memoryStore));
    } catch (e) {
      console.warn('Could not persist offline workspace storage:', e);
    }
  }
}

export function resetOfflineWorkspace(): WorkspaceData {
  memoryStore = createEmptyWorkspaceData();
  syncMemoryStore();
  return memoryStore;
}

let checkedScheduleEventsColumns = false;
async function ensureScheduleEventsColumns(d1?: D1Database) {
  if (!d1 || checkedScheduleEventsColumns) return;
  try {
    await d1.prepare('ALTER TABLE schedule_events ADD COLUMN end_date TEXT').run();
  } catch {}
  try {
    await d1.prepare('ALTER TABLE schedule_events ADD COLUMN is_all_day INTEGER DEFAULT 0').run();
  } catch {}
  checkedScheduleEventsColumns = true;
}

export class WorkspaceDatabase {
  private d1?: D1Database;
  private userId?: string;

  constructor(env?: DatabaseEnv, userId?: string) {
    this.d1 = env?.DB;
    this.userId = userId;
  }

  // --- USER AUTHENTICATION & PROFILE ---
  async getUserByGoogleSub(googleSub: string): Promise<User | null> {
    if (this.d1) {
      const row: any = await this.d1
        .prepare('SELECT * FROM users WHERE google_sub = ?')
        .bind(googleSub)
        .first();
      if (!row) return null;
      return {
        id: row.id,
        googleSub: row.google_sub,
        email: row.email,
        name: row.name,
        picture: row.picture,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }
    return null;
  }

  async getUserById(id: string): Promise<User | null> {
    if (this.d1) {
      const row: any = await this.d1.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
      if (!row) return null;
      return {
        id: row.id,
        googleSub: row.google_sub,
        email: row.email,
        name: row.name,
        picture: row.picture,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }
    return null;
  }

  async createOrUpdateUser(userData: {
    googleSub: string;
    email: string;
    name: string;
    picture?: string;
  }): Promise<User> {
    const existing = await this.getUserByGoogleSub(userData.googleSub);
    const id = existing?.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    if (this.d1) {
      await this.d1
        .prepare(`
          INSERT INTO users (id, google_sub, email, name, picture, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(google_sub) DO UPDATE SET
            email = excluded.email,
            name = excluded.name,
            picture = excluded.picture,
            updated_at = excluded.updated_at
        `)
        .bind(id, userData.googleSub, userData.email, userData.name, userData.picture || null, now, now)
        .run();

      const user = await this.getUserById(id);
      return user || { id, ...userData, createdAt: now, updatedAt: now };
    }

    return { id, ...userData, createdAt: now, updatedAt: now };
  }

  // --- PUSH NOTIFICATION SUBSCRIPTIONS ---
  async savePushSubscription(sub: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
  }): Promise<boolean> {
    if (this.d1) {
      const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await this.d1
        .prepare(`
          INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(endpoint) DO UPDATE SET
            user_id = excluded.user_id,
            p256dh = excluded.p256dh,
            auth = excluded.auth,
            user_agent = excluded.user_agent
        `)
        .bind(id, sub.userId, sub.endpoint, sub.p256dh, sub.auth, sub.userAgent || null)
        .run();
      return true;
    }
    return true;
  }

  async deletePushSubscription(endpoint: string): Promise<boolean> {
    if (this.d1) {
      await this.d1.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).run();
    }
    return true;
  }

  async getPushSubscriptionsForUser(userId: string): Promise<PushSubscriptionRecord[]> {
    if (this.d1) {
      const { results } = await this.d1
        .prepare('SELECT * FROM push_subscriptions WHERE user_id = ?')
        .bind(userId)
        .all();
      return (results || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        endpoint: r.endpoint,
        p256dh: r.p256dh,
        auth: r.auth,
        userAgent: r.user_agent,
        createdAt: r.created_at,
      }));
    }
    return [];
  }

  async getAllPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
    if (this.d1) {
      const { results } = await this.d1.prepare('SELECT * FROM push_subscriptions').all();
      return (results || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        endpoint: r.endpoint,
        p256dh: r.p256dh,
        auth: r.auth,
        userAgent: r.user_agent,
        createdAt: r.created_at,
      }));
    }
    return [];
  }

  // --- SEMESTERS ---
  async getSemesters(): Promise<Semester[]> {
    if (this.d1) {
      if (!this.userId) return [];
      const { results } = await this.d1
        .prepare('SELECT * FROM semesters WHERE user_id = ? ORDER BY start_date DESC')
        .bind(this.userId)
        .all();
      return (results || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        startDate: r.start_date,
        totalWeeks: r.total_weeks,
        isActive: Boolean(r.is_active),
        isArchived: Boolean(r.is_archived),
      }));
    }
    return memoryStore.semesters;
  }

  async saveSemester(sem: Semester): Promise<Semester> {
    if (this.d1) {
      if (!this.userId) throw new Error('Unauthorized');
      if (sem.isActive) {
        await this.d1
          .prepare('UPDATE semesters SET is_active = 0, is_archived = 1 WHERE user_id = ?')
          .bind(this.userId)
          .run();
      }
      await this.d1
        .prepare(`
          INSERT INTO semesters (id, user_id, name, start_date, total_weeks, is_active, is_archived)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            user_id = excluded.user_id,
            name = excluded.name,
            start_date = excluded.start_date,
            total_weeks = excluded.total_weeks,
            is_active = excluded.is_active,
            is_archived = excluded.is_archived
        `)
        .bind(
          sem.id,
          this.userId,
          sem.name,
          sem.startDate,
          sem.totalWeeks,
          sem.isActive ? 1 : 0,
          sem.isArchived ? 1 : 0
        )
        .run();
      return sem;
    }
    if (sem.isActive) {
      memoryStore.semesters.forEach((s) => {
        s.isActive = false;
        s.isArchived = true;
      });
    }
    const idx = memoryStore.semesters.findIndex((s) => s.id === sem.id);
    if (idx >= 0) memoryStore.semesters[idx] = sem;
    else memoryStore.semesters.unshift(sem);
    syncMemoryStore();
    return sem;
  }

  async deleteSemester(id: string): Promise<boolean> {
    if (this.d1) {
      if (!this.userId) return false;
      await this.d1
        .prepare('DELETE FROM course_schedules WHERE course_id IN (SELECT id FROM courses WHERE semester_id = ? AND user_id = ?)')
        .bind(id, this.userId)
        .run();
      await this.d1.prepare('DELETE FROM courses WHERE semester_id = ? AND user_id = ?').bind(id, this.userId).run();
      await this.d1.prepare('DELETE FROM schedule_events WHERE semester_id = ? AND user_id = ?').bind(id, this.userId).run();
      await this.d1.prepare('UPDATE tasks SET semester_id = NULL WHERE semester_id = ? AND user_id = ?').bind(id, this.userId).run();
      await this.d1.prepare('DELETE FROM semesters WHERE id = ? AND user_id = ?').bind(id, this.userId).run();

      const { results } = await this.d1
        .prepare('SELECT id, is_active FROM semesters WHERE user_id = ?')
        .bind(this.userId)
        .all();
      if (results && results.length > 0 && !results.some((r: any) => Boolean(r.is_active))) {
        await this.d1
          .prepare('UPDATE semesters SET is_active = 1, is_archived = 0 WHERE id = ? AND user_id = ?')
          .bind(results[0].id, this.userId)
          .run();
      }
      return true;
    }

    memoryStore.courses = memoryStore.courses.filter((c) => c.semesterId !== id);
    if (memoryStore.events) {
      memoryStore.events = memoryStore.events.filter((e) => e.semesterId !== id);
    }
    memoryStore.tasks = memoryStore.tasks.map((t) => (t.semesterId === id ? { ...t, semesterId: undefined } : t));
    memoryStore.semesters = memoryStore.semesters.filter((s) => s.id !== id);
    if (!memoryStore.semesters.some((s) => s.isActive) && memoryStore.semesters.length > 0) {
      memoryStore.semesters[0].isActive = true;
      memoryStore.semesters[0].isArchived = false;
    }
    syncMemoryStore();
    return true;
  }

  // --- TIME SLOTS ---
  async getTimeSlots(): Promise<TimeSlot[]> {
    if (this.d1) {
      if (this.userId) {
        const userRes = await this.d1
          .prepare('SELECT * FROM time_slots WHERE user_id = ? ORDER BY display_order ASC')
          .bind(this.userId)
          .all();
        if (userRes.results && userRes.results.length > 0) {
          const seen = new Set<string>();
          const mapped: TimeSlot[] = [];
          for (const r of (userRes.results as any[])) {
            if (!seen.has(r.session_code)) {
              seen.add(r.session_code);
              mapped.push({
                id: r.id,
                session: r.session_code,
                startTime: r.start_time,
                endTime: r.end_time,
                displayOrder: r.display_order,
              });
            }
          }
          return mapped;
        }
      }
      return defaultWorkspaceData.timeSlots;
    }
    return memoryStore.timeSlots && memoryStore.timeSlots.length > 0 ? memoryStore.timeSlots : defaultWorkspaceData.timeSlots;
  }

  async saveTimeSlots(slots: TimeSlot[]): Promise<TimeSlot[]> {
    if (this.d1) {
      if (!this.userId) throw new Error('Unauthorized');
      for (const slot of slots) {
        const id = `${slot.session}_${this.userId}`;
        await this.d1
          .prepare(`
            INSERT INTO time_slots (id, user_id, session_code, start_time, end_time, display_order)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              start_time = excluded.start_time,
              end_time = excluded.end_time,
              display_order = excluded.display_order
          `)
          .bind(id, this.userId, slot.session, slot.startTime, slot.endTime, slot.displayOrder || 0)
          .run();
      }
      return this.getTimeSlots();
    }
    memoryStore.timeSlots = slots;
    syncMemoryStore();
    return memoryStore.timeSlots;
  }

  // --- COURSES ---
  async getCourses(semesterId?: string): Promise<Course[]> {
    if (this.d1) {
      if (!this.userId) return [];
      let query = 'SELECT * FROM courses WHERE user_id = ?';
      const params: any[] = [this.userId];
      if (semesterId) {
        query += ' AND semester_id = ?';
        params.push(semesterId);
      }

      const { results: courseRows } = await this.d1.prepare(query).bind(...params).all();
      if (!courseRows || courseRows.length === 0) return [];

      const courseIds = courseRows.map((c: any) => c.id);
      const placeholders = courseIds.map(() => '?').join(',');
      const { results: schedRows } = await this.d1
        .prepare(`SELECT * FROM course_schedules WHERE course_id IN (${placeholders})`)
        .bind(...courseIds)
        .all();

      return courseRows.map((r: any) => ({
        id: r.id,
        semesterId: r.semester_id,
        code: r.code,
        name: r.name,
        teacher: r.teacher || undefined,
        location: r.location || '',
        color: r.color || '#2563EB',
        activeWeeks: JSON.parse(r.active_weeks_json || '[]'),
        schedules: (schedRows || [])
          .filter((s: any) => s.course_id === r.id)
          .map((s: any) => ({
            id: s.id,
            courseId: s.course_id,
            dayOfWeek: s.day_of_week,
            sessions: JSON.parse(s.sessions_json || '[]'),
            startTime: s.start_time,
            endTime: s.end_time,
          })),
      }));
    }

    if (semesterId) {
      return memoryStore.courses.filter((c) => c.semesterId === semesterId);
    }
    return memoryStore.courses;
  }

  async saveCourse(course: Course): Promise<Course> {
    if (this.d1) {
      if (!this.userId) throw new Error('Unauthorized');
      await this.d1
        .prepare(`
          INSERT INTO courses (id, user_id, semester_id, code, name, teacher, location, color, active_weeks_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            user_id = excluded.user_id,
            semester_id = excluded.semester_id,
            code = excluded.code,
            name = excluded.name,
            teacher = excluded.teacher,
            location = excluded.location,
            color = excluded.color,
            active_weeks_json = excluded.active_weeks_json
        `)
        .bind(
          course.id,
          this.userId,
          course.semesterId,
          course.code,
          course.name,
          course.teacher || null,
          course.location,
          course.color,
          JSON.stringify(course.activeWeeks || [])
        )
        .run();

      await this.d1.prepare('DELETE FROM course_schedules WHERE course_id = ?').bind(course.id).run();

      for (const s of course.schedules || []) {
        const schedId = s.id || `cs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await this.d1
          .prepare(`
            INSERT INTO course_schedules (id, course_id, day_of_week, sessions_json, start_time, end_time)
            VALUES (?, ?, ?, ?, ?, ?)
          `)
          .bind(schedId, course.id, s.dayOfWeek, JSON.stringify(s.sessions || []), s.startTime, s.endTime)
          .run();
      }

      return course;
    }

    const idx = memoryStore.courses.findIndex((c) => c.id === course.id);
    if (idx >= 0) memoryStore.courses[idx] = course;
    else memoryStore.courses.push(course);
    syncMemoryStore();
    return course;
  }

  async deleteCourse(id: string): Promise<void> {
    if (this.d1) {
      if (!this.userId) return;
      await this.d1
        .prepare('DELETE FROM course_schedules WHERE course_id IN (SELECT id FROM courses WHERE id = ? AND user_id = ?)')
        .bind(id, this.userId)
        .run();
      await this.d1.prepare('DELETE FROM courses WHERE id = ? AND user_id = ?').bind(id, this.userId).run();
      return;
    }
    memoryStore.courses = memoryStore.courses.filter((c) => c.id !== id);
    syncMemoryStore();
  }

  // --- EVENTS & ROUTINES ---
  async getEvents(semesterId?: string): Promise<ScheduleEvent[]> {
    if (this.d1) {
      if (!this.userId) return [];
      await ensureScheduleEventsColumns(this.d1);
      let query = 'SELECT * FROM schedule_events WHERE user_id = ?';
      const params: any[] = [this.userId];
      if (semesterId) {
        query += ' AND semester_id = ?';
        params.push(semesterId);
      }
      query += ' ORDER BY start_time ASC';

      const { results } = await this.d1.prepare(query).bind(...params).all();
      if (results && results.length > 0) {
        return results.map((r: any) => ({
          id: r.id,
          semesterId: r.semester_id,
          title: r.title,
          type: r.type as 'routine' | 'event',
          category: r.category || 'Study',
          daysOfWeek: JSON.parse(r.days_of_week_json || '[]'),
          specificDate: r.specific_date || undefined,
          endDate: r.end_date || undefined,
          isAllDay: Boolean(r.is_all_day),
          sessions: JSON.parse(r.sessions_json || '[]'),
          startTime: r.start_time,
          endTime: r.end_time,
          location: r.location || '',
          notes: r.notes || '',
          color: r.color || '#2563EB',
          activeWeeks: JSON.parse(r.active_weeks_json || '[]'),
        }));
      }
      return [];
    }

    if (!memoryStore.events) memoryStore.events = [];
    if (semesterId) {
      return memoryStore.events.filter((e) => e.semesterId === semesterId);
    }
    return memoryStore.events;
  }

  async saveEvent(event: ScheduleEvent): Promise<ScheduleEvent> {
    if (this.d1) {
      if (!this.userId) throw new Error('Unauthorized');
      await ensureScheduleEventsColumns(this.d1);
      await this.d1
        .prepare(`
          INSERT INTO schedule_events (
            id, user_id, semester_id, title, type, category,
            days_of_week_json, specific_date, end_date, is_all_day, sessions_json,
            start_time, end_time, location, notes, color, active_weeks_json
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            user_id = excluded.user_id,
            semester_id = excluded.semester_id,
            title = excluded.title,
            type = excluded.type,
            category = excluded.category,
            days_of_week_json = excluded.days_of_week_json,
            specific_date = excluded.specific_date,
            end_date = excluded.end_date,
            is_all_day = excluded.is_all_day,
            sessions_json = excluded.sessions_json,
            start_time = excluded.start_time,
            end_time = excluded.end_time,
            location = excluded.location,
            notes = excluded.notes,
            color = excluded.color,
            active_weeks_json = excluded.active_weeks_json
        `)
        .bind(
          event.id,
          this.userId,
          event.semesterId,
          event.title,
          event.type,
          event.category || 'Study',
          JSON.stringify(event.daysOfWeek || []),
          event.specificDate || null,
          event.endDate || null,
          event.isAllDay ? 1 : 0,
          JSON.stringify(event.sessions || []),
          event.startTime,
          event.endTime,
          event.location || null,
          event.notes || null,
          event.color || '#2563EB',
          JSON.stringify(event.activeWeeks || [])
        )
        .run();
      return event;
    }

    if (!memoryStore.events) memoryStore.events = [];
    const idx = memoryStore.events.findIndex((e) => e.id === event.id);
    if (idx >= 0) memoryStore.events[idx] = event;
    else memoryStore.events.push(event);
    syncMemoryStore();
    return event;
  }

  async deleteEvent(id: string): Promise<void> {
    if (this.d1) {
      if (!this.userId) return;
      await this.d1.prepare('DELETE FROM schedule_events WHERE id = ? AND user_id = ?').bind(id, this.userId).run();
      return;
    }
    if (!memoryStore.events) memoryStore.events = [];
    memoryStore.events = memoryStore.events.filter((e) => e.id !== id);
    syncMemoryStore();
  }

  // --- TASKS ---
  async getTasks(semesterId?: string): Promise<Task[]> {
    if (this.d1) {
      if (!this.userId) return [];
      let query = 'SELECT * FROM tasks WHERE user_id = ?';
      const params: any[] = [this.userId];
      if (semesterId) {
        query += ' AND (semester_id = ? OR semester_id IS NULL)';
        params.push(semesterId);
      }
      query += ' ORDER BY due_date ASC';

      const { results } = await this.d1.prepare(query).bind(...params).all();
      return (results || []).map((r: any) => ({
        id: r.id,
        semesterId: r.semester_id || undefined,
        title: r.title,
        category: r.category,
        tags: JSON.parse(r.tags_json || '[]'),
        dueDate: r.due_date,
        status: r.status,
        priority: r.priority,
        linkedPaperId: r.linked_paper_id || undefined,
        linkedMilestoneId: r.linked_milestone_id || undefined,
      }));
    }

    if (semesterId) {
      return memoryStore.tasks.filter((t) => !t.semesterId || t.semesterId === semesterId);
    }
    return memoryStore.tasks;
  }

  async saveTask(task: Task): Promise<Task> {
    if (this.d1) {
      if (!this.userId) throw new Error('Unauthorized');
      await this.d1
        .prepare(`
          INSERT INTO tasks (id, user_id, semester_id, title, category, tags_json, due_date, status, priority, linked_paper_id, linked_milestone_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            user_id = excluded.user_id,
            semester_id = excluded.semester_id,
            title = excluded.title,
            category = excluded.category,
            tags_json = excluded.tags_json,
            due_date = excluded.due_date,
            status = excluded.status,
            priority = excluded.priority,
            linked_paper_id = excluded.linked_paper_id,
            linked_milestone_id = excluded.linked_milestone_id
        `)
        .bind(
          task.id,
          this.userId,
          task.semesterId || null,
          task.title,
          task.category,
          JSON.stringify(task.tags || []),
          task.dueDate,
          task.status,
          task.priority,
          task.linkedPaperId || null,
          task.linkedMilestoneId || null
        )
        .run();
      return task;
    }

    const idx = memoryStore.tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) memoryStore.tasks[idx] = task;
    else memoryStore.tasks.push(task);
    syncMemoryStore();
    return task;
  }

  async deleteTask(id: string): Promise<void> {
    if (this.d1) {
      if (!this.userId) return;
      await this.d1.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').bind(id, this.userId).run();
      return;
    }
    memoryStore.tasks = memoryStore.tasks.filter((t) => t.id !== id);
    syncMemoryStore();
  }

  // --- KANBAN ---
  async getKanban(semesterId?: string): Promise<KanbanMilestone[]> {
    if (this.d1) {
      if (!this.userId) return [];
      let query = 'SELECT * FROM kanban_milestones WHERE user_id = ?';
      const params: any[] = [this.userId];
      if (semesterId) {
        query += ' AND (semester_id = ? OR semester_id IS NULL)';
        params.push(semesterId);
      }
      query += ' ORDER BY sort_order ASC';

      const { results } = await this.d1.prepare(query).bind(...params).all();
      return (results || []).map((r: any) => ({
        id: r.id,
        semesterId: r.semester_id || undefined,
        title: r.title,
        stage: r.stage,
        targetWeek: r.target_week,
        project: r.project,
        notes: r.notes,
        sortOrder: r.sort_order,
      }));
    }
    return memoryStore.kanban;
  }

  async saveKanban(item: KanbanMilestone): Promise<KanbanMilestone> {
    if (this.d1) {
      if (!this.userId) throw new Error('Unauthorized');
      await this.d1
        .prepare(`
          INSERT INTO kanban_milestones (id, user_id, semester_id, title, stage, target_week, project, notes, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            user_id = excluded.user_id,
            semester_id = excluded.semester_id,
            title = excluded.title,
            stage = excluded.stage,
            target_week = excluded.target_week,
            project = excluded.project,
            notes = excluded.notes,
            sort_order = excluded.sort_order
        `)
        .bind(
          item.id,
          this.userId,
          item.semesterId || null,
          item.title,
          item.stage,
          item.targetWeek,
          item.project,
          item.notes || null,
          item.sortOrder || 0
        )
        .run();
      return item;
    }
    const idx = memoryStore.kanban.findIndex((k) => k.id === item.id);
    if (idx >= 0) memoryStore.kanban[idx] = item;
    else memoryStore.kanban.push(item);
    syncMemoryStore();
    return item;
  }

  async deleteKanban(id: string): Promise<void> {
    if (this.d1) {
      if (!this.userId) return;
      await this.d1.prepare('DELETE FROM kanban_milestones WHERE id = ? AND user_id = ?').bind(id, this.userId).run();
      return;
    }
    memoryStore.kanban = memoryStore.kanban.filter((k) => k.id !== id);
    syncMemoryStore();
  }

  // --- PAPERS (LITERATURE) ---
  async getPapers(): Promise<Paper[]> {
    if (this.d1) {
      if (!this.userId) return [];
      const { results } = await this.d1
        .prepare('SELECT * FROM papers WHERE user_id = ? ORDER BY created_at DESC')
        .bind(this.userId)
        .all();
      return (results || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        authors: r.authors,
        venue: r.venue,
        year: r.year,
        arxivId: r.arxiv_id,
        pdfR2Key: r.pdf_r2_key,
        codeUrl: r.code_url,
        status: r.status,
        rating: r.rating,
        tldr: r.tldr,
        tags: JSON.parse(r.tags_json || '[]'),
        bibtex: r.bibtex,
        notesMarkdown: r.notes_markdown,
      }));
    }
    return memoryStore.papers;
  }

  async savePaper(paper: Paper): Promise<Paper> {
    if (this.d1) {
      if (!this.userId) throw new Error('Unauthorized');
      await this.d1
        .prepare(`
          INSERT INTO papers (id, user_id, title, authors, venue, year, arxiv_id, pdf_r2_key, code_url, status, rating, tldr, tags_json, bibtex, notes_markdown)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            user_id = excluded.user_id,
            title = excluded.title,
            authors = excluded.authors,
            venue = excluded.venue,
            year = excluded.year,
            arxiv_id = excluded.arxiv_id,
            pdf_r2_key = excluded.pdf_r2_key,
            code_url = excluded.code_url,
            status = excluded.status,
            rating = excluded.rating,
            tldr = excluded.tldr,
            tags_json = excluded.tags_json,
            bibtex = excluded.bibtex,
            notes_markdown = excluded.notes_markdown
        `)
        .bind(
          paper.id,
          this.userId,
          paper.title,
          paper.authors || null,
          paper.venue || null,
          paper.year || null,
          paper.arxivId || null,
          paper.pdfR2Key || null,
          paper.codeUrl || null,
          paper.status,
          paper.rating || 0,
          paper.tldr || null,
          JSON.stringify(paper.tags || []),
          paper.bibtex || null,
          paper.notesMarkdown || null
        )
        .run();
      return paper;
    }
    const idx = memoryStore.papers.findIndex((p) => p.id === paper.id);
    if (idx >= 0) memoryStore.papers[idx] = paper;
    else memoryStore.papers.unshift(paper);
    syncMemoryStore();
    return paper;
  }

  async deletePaper(id: string): Promise<boolean> {
    if (this.d1) {
      if (!this.userId) return false;
      await this.d1.prepare('DELETE FROM papers WHERE id = ? AND user_id = ?').bind(id, this.userId).run();
      return true;
    }
    memoryStore.papers = memoryStore.papers.filter((p) => p.id !== id);
    syncMemoryStore();
    return true;
  }

  // --- CONFERENCES ---
  async getConferences(): Promise<Conference[]> {
    if (this.d1) {
      if (!this.userId) return [];
      const { results } = await this.d1
        .prepare('SELECT * FROM conferences WHERE user_id = ? ORDER BY submission_deadline ASC')
        .bind(this.userId)
        .all();
      return (results || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        acronym: r.acronym,
        tier: r.tier,
        abstractDeadline: r.abstract_deadline,
        submissionDeadline: r.submission_deadline,
        rebuttalDeadline: r.rebuttal_deadline,
        cameraReadyDeadline: r.camera_ready_deadline,
        paperTitle: r.paper_title,
        status: r.status,
      }));
    }
    return memoryStore.conferences;
  }

  async saveConference(conf: Conference): Promise<Conference> {
    if (this.d1) {
      if (!this.userId) throw new Error('Unauthorized');
      await this.d1
        .prepare(`
          INSERT INTO conferences (id, user_id, name, acronym, tier, abstract_deadline, submission_deadline, rebuttal_deadline, camera_ready_deadline, paper_title, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            user_id = excluded.user_id,
            name = excluded.name,
            acronym = excluded.acronym,
            tier = excluded.tier,
            abstract_deadline = excluded.abstract_deadline,
            submission_deadline = excluded.submission_deadline,
            rebuttal_deadline = excluded.rebuttal_deadline,
            camera_ready_deadline = excluded.camera_ready_deadline,
            paper_title = excluded.paper_title,
            status = excluded.status
        `)
        .bind(
          conf.id,
          this.userId,
          conf.name,
          conf.acronym,
          conf.tier || 'A*',
          conf.abstractDeadline || null,
          conf.submissionDeadline,
          conf.rebuttalDeadline || null,
          conf.cameraReadyDeadline || null,
          conf.paperTitle || null,
          conf.status || 'preparing'
        )
        .run();
      return conf;
    }
    const idx = memoryStore.conferences.findIndex((c) => c.id === conf.id);
    if (idx >= 0) memoryStore.conferences[idx] = conf;
    else memoryStore.conferences.push(conf);
    syncMemoryStore();
    return conf;
  }

  async deleteConference(id: string): Promise<boolean> {
    if (this.d1) {
      if (!this.userId) return false;
      await this.d1.prepare('DELETE FROM conferences WHERE id = ? AND user_id = ?').bind(id, this.userId).run();
      return true;
    }
    memoryStore.conferences = memoryStore.conferences.filter((c) => c.id !== id);
    syncMemoryStore();
    return true;
  }

  // --- EXPERIMENT LOGS ---
  async getExperiments(): Promise<ExperimentLog[]> {
    if (this.d1) {
      if (!this.userId) return [];
      const { results } = await this.d1
        .prepare('SELECT * FROM experiment_logs WHERE user_id = ? ORDER BY created_at DESC')
        .bind(this.userId)
        .all();
      return (results || []).map((r: any) => ({
        id: r.id,
        projectTag: r.project_tag,
        name: r.name,
        hypothesis: r.hypothesis,
        dataset: r.dataset,
        hyperparameters: JSON.parse(r.hyperparameters_json || '{}'),
        metrics: JSON.parse(r.metrics_json || '{}'),
        status: r.status,
        plotR2Key: r.plot_r2_key,
        notes: r.notes,
      }));
    }
    return memoryStore.experimentLogs;
  }

  async saveExperiment(exp: ExperimentLog): Promise<ExperimentLog> {
    if (this.d1) {
      if (!this.userId) throw new Error('Unauthorized');
      await this.d1
        .prepare(`
          INSERT INTO experiment_logs (id, user_id, project_tag, name, hypothesis, dataset, hyperparameters_json, metrics_json, status, plot_r2_key, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            user_id = excluded.user_id,
            project_tag = excluded.project_tag,
            name = excluded.name,
            hypothesis = excluded.hypothesis,
            dataset = excluded.dataset,
            hyperparameters_json = excluded.hyperparameters_json,
            metrics_json = excluded.metrics_json,
            status = excluded.status,
            plot_r2_key = excluded.plot_r2_key,
            notes = excluded.notes
        `)
        .bind(
          exp.id,
          this.userId,
          exp.projectTag,
          exp.name,
          exp.hypothesis || null,
          exp.dataset || null,
          JSON.stringify(exp.hyperparameters || {}),
          JSON.stringify(exp.metrics || {}),
          exp.status || 'completed',
          exp.plotR2Key || null,
          exp.notes || null
        )
        .run();
      return exp;
    }
    const idx = memoryStore.experimentLogs.findIndex((e) => e.id === exp.id);
    if (idx >= 0) memoryStore.experimentLogs[idx] = exp;
    else memoryStore.experimentLogs.unshift(exp);
    syncMemoryStore();
    return exp;
  }

  async deleteExperiment(id: string): Promise<boolean> {
    if (this.d1) {
      if (!this.userId) return false;
      await this.d1.prepare('DELETE FROM experiment_logs WHERE id = ? AND user_id = ?').bind(id, this.userId).run();
      return true;
    }
    memoryStore.experimentLogs = memoryStore.experimentLogs.filter((e) => e.id !== id);
    syncMemoryStore();
    return true;
  }

  // --- ADVISOR MEETINGS ---
  async getMeetings(): Promise<AdvisorMeeting[]> {
    if (this.d1) {
      if (!this.userId) return [];
      const { results } = await this.d1
        .prepare('SELECT * FROM advisor_meetings WHERE user_id = ? ORDER BY meeting_date DESC')
        .bind(this.userId)
        .all();
      return (results || []).map((r: any) => ({
        id: r.id,
        meetingDate: r.meeting_date,
        agendaMarkdown: r.agenda_markdown,
        discussionNotes: r.discussion_notes,
        actionItems: JSON.parse(r.action_items_json || '[]'),
        weeklyDigestMarkdown: r.weekly_digest_markdown,
      }));
    }
    return memoryStore.advisorMeetings;
  }

  async saveMeeting(meeting: AdvisorMeeting): Promise<AdvisorMeeting> {
    if (this.d1) {
      if (!this.userId) throw new Error('Unauthorized');
      await this.d1
        .prepare(`
          INSERT INTO advisor_meetings (id, user_id, meeting_date, agenda_markdown, discussion_notes, action_items_json, weekly_digest_markdown)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            user_id = excluded.user_id,
            meeting_date = excluded.meeting_date,
            agenda_markdown = excluded.agenda_markdown,
            discussion_notes = excluded.discussion_notes,
            action_items_json = excluded.action_items_json,
            weekly_digest_markdown = excluded.weekly_digest_markdown
        `)
        .bind(
          meeting.id,
          this.userId,
          meeting.meetingDate,
          meeting.agendaMarkdown || null,
          meeting.discussionNotes || null,
          JSON.stringify(meeting.actionItems || []),
          meeting.weeklyDigestMarkdown || null
        )
        .run();
      return meeting;
    }
    const idx = memoryStore.advisorMeetings.findIndex((m) => m.id === meeting.id);
    if (idx >= 0) memoryStore.advisorMeetings[idx] = meeting;
    else memoryStore.advisorMeetings.unshift(meeting);
    syncMemoryStore();
    return meeting;
  }

  async deleteMeeting(id: string): Promise<boolean> {
    if (this.d1) {
      if (!this.userId) return false;
      await this.d1.prepare('DELETE FROM advisor_meetings WHERE id = ? AND user_id = ?').bind(id, this.userId).run();
      return true;
    }
    memoryStore.advisorMeetings = memoryStore.advisorMeetings.filter((m) => m.id !== id);
    syncMemoryStore();
    return true;
  }

  // --- ATTENDANCE & ROUTINE COMPLETION RECORDS ---
  async getAttendanceRecords(date?: string, targetId?: string): Promise<AttendanceRecord[]> {
    if (this.d1) {
      if (!this.userId) return [];
      try {
        let query = 'SELECT * FROM attendance_records WHERE user_id = ?';
        const params: any[] = [this.userId];
        if (date) {
          query += ' AND date = ?';
          params.push(date);
        }
        if (targetId) {
          query += ' AND target_id = ?';
          params.push(targetId);
        }
        query += ' ORDER BY date DESC, updated_at DESC';

        const { results } = await this.d1.prepare(query).bind(...params).all();
        return (results || []).map((r: any) => ({
          id: r.id,
          targetId: r.target_id,
          targetType: r.target_type,
          date: r.date,
          status: r.status,
          academicWeek: r.academic_week,
          note: r.note,
          updatedAt: r.updated_at,
        }));
      } catch (e) {
        console.warn('Could not read attendance_records from D1:', e);
      }
      return [];
    }
    let list = memoryStore.attendanceRecords || [];
    if (date) list = list.filter((r) => r.date === date);
    if (targetId) list = list.filter((r) => r.targetId === targetId);
    return list;
  }

  async saveAttendanceRecord(record: AttendanceRecord): Promise<AttendanceRecord> {
    if (this.d1) {
      if (!this.userId) throw new Error('Unauthorized');
      try {
        await this.d1
          .prepare(`
            INSERT INTO attendance_records (id, user_id, target_id, target_type, date, status, academic_week, note, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              user_id = excluded.user_id,
              target_id = excluded.target_id,
              target_type = excluded.target_type,
              date = excluded.date,
              status = excluded.status,
              academic_week = excluded.academic_week,
              note = excluded.note,
              updated_at = excluded.updated_at
          `)
          .bind(
            record.id,
            this.userId,
            record.targetId,
            record.targetType,
            record.date,
            record.status,
            record.academicWeek || null,
            record.note || null,
            record.updatedAt || new Date().toISOString()
          )
          .run();
        return record;
      } catch (e) {
        console.warn('Could not save attendance_record to D1:', e);
      }
    }
    if (!memoryStore.attendanceRecords) memoryStore.attendanceRecords = [];
    const idx = memoryStore.attendanceRecords.findIndex((r) => r.id === record.id);
    if (idx >= 0) memoryStore.attendanceRecords[idx] = record;
    else memoryStore.attendanceRecords.unshift(record);
    syncMemoryStore();
    return record;
  }

  async deleteAttendanceRecord(id: string): Promise<boolean> {
    if (this.d1) {
      if (!this.userId) return false;
      try {
        await this.d1.prepare('DELETE FROM attendance_records WHERE id = ? AND user_id = ?').bind(id, this.userId).run();
        return true;
      } catch (e) {}
    }
    if (memoryStore.attendanceRecords) {
      memoryStore.attendanceRecords = memoryStore.attendanceRecords.filter((r) => r.id !== id);
      syncMemoryStore();
    }
    return true;
  }

  // --- SAMPLE DATA & WORKSPACE RESET ---
  async loadSampleData(): Promise<void> {
    if (!this.userId) throw new Error('Unauthorized');
    const userSuffix = this.userId.replace(/[^a-zA-Z0-9]/g, '').slice(-6);
    
    // Deep clone default template
    const sample = JSON.parse(JSON.stringify(defaultWorkspaceData)) as WorkspaceData;

    // Remap semesters
    const semIdMap = new Map<string, string>();
    sample.semesters.forEach((s) => {
      const oldId = s.id;
      s.id = `${s.id}_${userSuffix}`;
      semIdMap.set(oldId, s.id);
    });

    sample.courses.forEach((c) => {
      c.id = `${c.id}_${userSuffix}`;
      if (c.semesterId && semIdMap.has(c.semesterId)) {
        c.semesterId = semIdMap.get(c.semesterId)!;
      }
      c.schedules?.forEach((sc) => {
        sc.id = `${sc.id}_${userSuffix}`;
        sc.courseId = c.id;
      });
    });

    sample.events?.forEach((e) => {
      e.id = `${e.id}_${userSuffix}`;
      if (e.semesterId && semIdMap.has(e.semesterId)) {
        e.semesterId = semIdMap.get(e.semesterId)!;
      }
    });

    sample.tasks.forEach((t) => {
      t.id = `${t.id}_${userSuffix}`;
      if (t.semesterId && semIdMap.has(t.semesterId)) {
        t.semesterId = semIdMap.get(t.semesterId)!;
      }
    });

    sample.kanban.forEach((k) => {
      k.id = `${k.id}_${userSuffix}`;
      if (k.semesterId && semIdMap.has(k.semesterId)) {
        k.semesterId = semIdMap.get(k.semesterId)!;
      }
    });

    sample.papers.forEach((p) => {
      p.id = `${p.id}_${userSuffix}`;
    });

    sample.conferences.forEach((c) => {
      c.id = `${c.id}_${userSuffix}`;
    });

    sample.experimentLogs.forEach((x) => {
      x.id = `${x.id}_${userSuffix}`;
    });

    sample.advisorMeetings.forEach((m) => {
      m.id = `${m.id}_${userSuffix}`;
    });

    sample.attendanceRecords?.forEach((a) => {
      a.id = `${a.id}_${userSuffix}`;
    });

    await this.importAll(sample);
  }

  async clearUserData(): Promise<void> {
    if (!this.userId) throw new Error('Unauthorized');
    if (this.d1) {
      await this.d1.prepare('DELETE FROM course_schedules WHERE course_id IN (SELECT id FROM courses WHERE user_id = ?)').bind(this.userId).run();
      await this.d1.prepare('DELETE FROM courses WHERE user_id = ?').bind(this.userId).run();
      await this.d1.prepare('DELETE FROM schedule_events WHERE user_id = ?').bind(this.userId).run();
      await this.d1.prepare('DELETE FROM tasks WHERE user_id = ?').bind(this.userId).run();
      await this.d1.prepare('DELETE FROM kanban_milestones WHERE user_id = ?').bind(this.userId).run();
      await this.d1.prepare('DELETE FROM papers WHERE user_id = ?').bind(this.userId).run();
      await this.d1.prepare('DELETE FROM conferences WHERE user_id = ?').bind(this.userId).run();
      await this.d1.prepare('DELETE FROM experiment_logs WHERE user_id = ?').bind(this.userId).run();
      await this.d1.prepare('DELETE FROM advisor_meetings WHERE user_id = ?').bind(this.userId).run();
      await this.d1.prepare('DELETE FROM attendance_records WHERE user_id = ?').bind(this.userId).run();
      await this.d1.prepare('DELETE FROM semesters WHERE user_id = ?').bind(this.userId).run();
      await this.d1.prepare('DELETE FROM time_slots WHERE user_id = ?').bind(this.userId).run();
      return;
    }

    memoryStore = createEmptyWorkspaceData();
    syncMemoryStore();
  }

  // --- FULL DUMP / RESTORE ---
  async exportAll(): Promise<WorkspaceData> {
    return {
      semesters: await this.getSemesters(),
      timeSlots: await this.getTimeSlots(),
      courses: await this.getCourses(),
      events: await this.getEvents(),
      tasks: await this.getTasks(),
      kanban: await this.getKanban(),
      papers: await this.getPapers(),
      conferences: await this.getConferences(),
      experimentLogs: await this.getExperiments(),
      advisorMeetings: await this.getMeetings(),
      attendanceRecords: await this.getAttendanceRecords(),
    };
  }

  async importAll(data: Partial<WorkspaceData>): Promise<void> {
    if (data.semesters) for (const s of data.semesters) await this.saveSemester(s);
    if (data.timeSlots) await this.saveTimeSlots(data.timeSlots);
    if (data.courses) for (const c of data.courses) await this.saveCourse(c);
    if (data.events) {
      for (const e of data.events) await this.saveEvent(e);
    }
    if (data.tasks) for (const t of data.tasks) await this.saveTask(t);
    if (data.kanban) for (const k of data.kanban) await this.saveKanban(k);
    if (data.papers) for (const p of data.papers) await this.savePaper(p);
    if (data.conferences) for (const c of data.conferences) await this.saveConference(c);
    if (data.experimentLogs) for (const e of data.experimentLogs) await this.saveExperiment(e);
    if (data.advisorMeetings) for (const m of data.advisorMeetings) await this.saveMeeting(m);
    if (data.attendanceRecords) {
      for (const a of data.attendanceRecords) await this.saveAttendanceRecord(a);
    }
    syncMemoryStore();
  }
}
