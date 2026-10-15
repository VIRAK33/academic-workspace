import { WorkspaceData, Task, Course, Semester, TimeSlot, KanbanMilestone, Paper, Conference, ExperimentLog, AdvisorMeeting, ScheduleEvent } from '../types';
import { defaultWorkspaceData } from './defaultData';

export interface DatabaseEnv {
  DB?: D1Database;
  ACADEMIC_STORAGE?: R2Bucket;
}

// In-memory / localStorage fallback store for local development, CLI & offline PWA
const OFFLINE_STORAGE_KEY = 'phd_workspace_offline_v1';

function initMemoryStore(): WorkspaceData {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.semesters) && Array.isArray(parsed.courses) && Array.isArray(parsed.tasks)) {
          if (!parsed.events) parsed.events = defaultWorkspaceData.events || [];
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read offline workspace storage:', e);
    }
  }
  return JSON.parse(JSON.stringify(defaultWorkspaceData));
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
  memoryStore = JSON.parse(JSON.stringify(defaultWorkspaceData));
  syncMemoryStore();
  return memoryStore;
}

export class WorkspaceDatabase {
  private d1?: D1Database;

  constructor(env?: DatabaseEnv) {
    this.d1 = env?.DB;
  }

  // --- SEMESTERS ---
  async getSemesters(): Promise<Semester[]> {
    if (this.d1) {
      const { results } = await this.d1.prepare('SELECT * FROM semesters ORDER BY start_date DESC').all();
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
      if (sem.isActive) {
        await this.d1.prepare('UPDATE semesters SET is_active = 0, is_archived = 1').run();
      }
      await this.d1.prepare(`
        INSERT INTO semesters (id, name, start_date, total_weeks, is_active, is_archived)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          start_date = excluded.start_date,
          total_weeks = excluded.total_weeks,
          is_active = excluded.is_active,
          is_archived = excluded.is_archived
      `).bind(sem.id, sem.name, sem.startDate, sem.totalWeeks, sem.isActive ? 1 : 0, sem.isArchived ? 1 : 0).run();
      return sem;
    }
    if (sem.isActive) {
      memoryStore.semesters.forEach(s => { s.isActive = false; s.isArchived = true; });
    }
    const idx = memoryStore.semesters.findIndex(s => s.id === sem.id);
    if (idx >= 0) memoryStore.semesters[idx] = sem;
    else memoryStore.semesters.unshift(sem);
    syncMemoryStore();
    return sem;
  }

  async deleteSemester(id: string): Promise<boolean> {
    if (this.d1) {
      await this.d1.prepare('DELETE FROM course_schedules WHERE course_id IN (SELECT id FROM courses WHERE semester_id = ?)').bind(id).run();
      await this.d1.prepare('DELETE FROM courses WHERE semester_id = ?').bind(id).run();
      await this.d1.prepare('UPDATE tasks SET semester_id = NULL WHERE semester_id = ?').bind(id).run();
      await this.d1.prepare('DELETE FROM semesters WHERE id = ?').bind(id).run();
      
      // Ensure at least one active semester if any remain
      const { results } = await this.d1.prepare('SELECT id, is_active FROM semesters').all();
      if (results && results.length > 0 && !results.some((r: any) => Boolean(r.is_active))) {
        await this.d1.prepare('UPDATE semesters SET is_active = 1, is_archived = 0 WHERE id = ?').bind(results[0].id).run();
      }
      return true;
    }

    memoryStore.courses = memoryStore.courses.filter(c => c.semesterId !== id);
    memoryStore.tasks = memoryStore.tasks.map(t => t.semesterId === id ? { ...t, semesterId: undefined } : t);
    memoryStore.semesters = memoryStore.semesters.filter(s => s.id !== id);
    if (!memoryStore.semesters.some(s => s.isActive) && memoryStore.semesters.length > 0) {
      memoryStore.semesters[0].isActive = true;
      memoryStore.semesters[0].isArchived = false;
    }
    syncMemoryStore();
    return true;
  }

  // --- TIME SLOTS ---
  async getTimeSlots(): Promise<TimeSlot[]> {
    if (this.d1) {
      const { results } = await this.d1.prepare('SELECT * FROM time_slots ORDER BY display_order ASC').all();
      return (results || []).map((r: any) => ({
        id: r.id,
        session: r.session_code,
        startTime: r.start_time,
        endTime: r.end_time,
        displayOrder: r.display_order,
      }));
    }
    return memoryStore.timeSlots;
  }

  async saveTimeSlots(slots: TimeSlot[]): Promise<TimeSlot[]> {
    if (this.d1) {
      for (const slot of slots) {
        await this.d1.prepare(`
          UPDATE time_slots SET start_time = ?, end_time = ? WHERE session_code = ?
        `).bind(slot.startTime, slot.endTime, slot.session).run();
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
      let query = 'SELECT * FROM courses';
      const params: any[] = [];
      if (semesterId) {
        query += ' WHERE semester_id = ?';
        params.push(semesterId);
      }
      const { results: courseRows } = await this.d1.prepare(query).bind(...params).all();
      const courses: Course[] = [];

      for (const cr of (courseRows || [])) {
        const { results: schedRows } = await this.d1.prepare('SELECT * FROM course_schedules WHERE course_id = ?').bind(cr.id).all();
        courses.push({
          id: cr.id as string,
          semesterId: cr.semester_id as string,
          code: cr.code as string,
          name: cr.name as string,
          teacher: cr.teacher as string,
          location: cr.location as string,
          color: (cr.color as string) || '#2563EB',
          activeWeeks: JSON.parse((cr.active_weeks_json as string) || '[]'),
          schedules: (schedRows || []).map((s: any) => ({
            id: s.id,
            courseId: s.course_id,
            dayOfWeek: s.day_of_week,
            sessions: JSON.parse(s.sessions_json || '[]'),
            startTime: s.start_time,
            endTime: s.end_time,
          })),
        });
      }
      return courses;
    }

    if (semesterId) {
      return memoryStore.courses.filter(c => c.semesterId === semesterId);
    }
    return memoryStore.courses;
  }

  async saveCourse(course: Course): Promise<Course> {
    if (this.d1) {
      await this.d1.prepare(`
        INSERT INTO courses (id, semester_id, code, name, teacher, location, color, active_weeks_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          code = excluded.code,
          name = excluded.name,
          teacher = excluded.teacher,
          location = excluded.location,
          color = excluded.color,
          active_weeks_json = excluded.active_weeks_json
      `).bind(
        course.id,
        course.semesterId,
        course.code,
        course.name,
        course.teacher || '',
        course.location,
        course.color,
        JSON.stringify(course.activeWeeks)
      ).run();

      await this.d1.prepare('DELETE FROM course_schedules WHERE course_id = ?').bind(course.id).run();
      for (const sch of course.schedules) {
        await this.d1.prepare(`
          INSERT INTO course_schedules (id, course_id, day_of_week, sessions_json, start_time, end_time)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          sch.id || 'sch_' + Math.random().toString(36).substring(2, 9),
          course.id,
          sch.dayOfWeek,
          JSON.stringify(sch.sessions),
          sch.startTime,
          sch.endTime
        ).run();
      }
      return course;
    }

    const idx = memoryStore.courses.findIndex(c => c.id === course.id);
    if (idx >= 0) memoryStore.courses[idx] = course;
    else memoryStore.courses.push(course);
    syncMemoryStore();
    return course;
  }

  async deleteCourse(id: string): Promise<boolean> {
    if (this.d1) {
      await this.d1.prepare('DELETE FROM course_schedules WHERE course_id = ?').bind(id).run();
      await this.d1.prepare('DELETE FROM courses WHERE id = ?').bind(id).run();
      return true;
    }
    memoryStore.courses = memoryStore.courses.filter(c => c.id !== id);
    syncMemoryStore();
    return true;
  }

  // --- TASKS ---
  async getTasks(semesterId?: string): Promise<Task[]> {
    if (this.d1) {
      let q = 'SELECT * FROM tasks';
      const params: any[] = [];
      if (semesterId) {
        q += ' WHERE semester_id = ? OR semester_id IS NULL';
        params.push(semesterId);
      }
      q += ' ORDER BY due_date ASC';
      const { results } = await this.d1.prepare(q).bind(...params).all();
      return (results || []).map((r: any) => ({
        id: r.id,
        semesterId: r.semester_id,
        title: r.title,
        category: r.category,
        tags: JSON.parse(r.tags_json || '[]'),
        dueDate: r.due_date,
        status: r.status,
        priority: r.priority,
        linkedPaperId: r.linked_paper_id,
        linkedMilestoneId: r.linked_milestone_id,
      }));
    }
    return semesterId
      ? memoryStore.tasks.filter(t => !t.semesterId || t.semesterId === semesterId)
      : memoryStore.tasks;
  }

  async saveTask(task: Task): Promise<Task> {
    if (this.d1) {
      await this.d1.prepare(`
        INSERT INTO tasks (id, semester_id, title, category, tags_json, due_date, status, priority, linked_paper_id, linked_milestone_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          category = excluded.category,
          tags_json = excluded.tags_json,
          due_date = excluded.due_date,
          status = excluded.status,
          priority = excluded.priority,
          linked_paper_id = excluded.linked_paper_id,
          linked_milestone_id = excluded.linked_milestone_id
      `).bind(
        task.id,
        task.semesterId || null,
        task.title,
        task.category || 'Research',
        JSON.stringify(task.tags || []),
        task.dueDate,
        task.status || 'in_progress',
        task.priority || 'medium',
        task.linkedPaperId || null,
        task.linkedMilestoneId || null
      ).run();
      return task;
    }
    const idx = memoryStore.tasks.findIndex(t => t.id === task.id);
    if (idx >= 0) memoryStore.tasks[idx] = task;
    else memoryStore.tasks.unshift(task);
    syncMemoryStore();
    return task;
  }

  async deleteTask(id: string): Promise<boolean> {
    if (this.d1) {
      await this.d1.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
      return true;
    }
    memoryStore.tasks = memoryStore.tasks.filter(t => t.id !== id);
    syncMemoryStore();
    return true;
  }

  // --- KANBAN ---
  async getKanban(): Promise<KanbanMilestone[]> {
    if (this.d1) {
      const { results } = await this.d1.prepare('SELECT * FROM kanban_milestones ORDER BY sort_order ASC, created_at ASC').all();
      return (results || []).map((r: any) => ({
        id: r.id,
        semesterId: r.semester_id,
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
      await this.d1.prepare(`
        INSERT INTO kanban_milestones (id, semester_id, title, stage, target_week, project, notes, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          stage = excluded.stage,
          target_week = excluded.target_week,
          project = excluded.project,
          notes = excluded.notes,
          sort_order = excluded.sort_order
      `).bind(
        item.id,
        item.semesterId || null,
        item.title,
        item.stage,
        item.targetWeek,
        item.project,
        item.notes || null,
        item.sortOrder || 0
      ).run();
      return item;
    }
    const idx = memoryStore.kanban.findIndex(k => k.id === item.id);
    if (idx >= 0) memoryStore.kanban[idx] = item;
    else memoryStore.kanban.push(item);
    syncMemoryStore();
    return item;
  }

  async deleteKanban(id: string): Promise<boolean> {
    if (this.d1) {
      await this.d1.prepare('DELETE FROM kanban_milestones WHERE id = ?').bind(id).run();
      return true;
    }
    memoryStore.kanban = memoryStore.kanban.filter(k => k.id !== id);
    syncMemoryStore();
    return true;
  }

  // --- PAPERS ---
  async getPapers(): Promise<Paper[]> {
    if (this.d1) {
      const { results } = await this.d1.prepare('SELECT * FROM papers ORDER BY created_at DESC').all();
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
        rating: r.rating || 0,
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
      await this.d1.prepare(`
        INSERT INTO papers (id, title, authors, venue, year, arxiv_id, pdf_r2_key, code_url, status, rating, tldr, tags_json, bibtex, notes_markdown)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
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
      `).bind(
        paper.id,
        paper.title,
        paper.authors || null,
        paper.venue || null,
        paper.year || null,
        paper.arxivId || null,
        paper.pdfR2Key || null,
        paper.codeUrl || null,
        paper.status || 'to_read',
        paper.rating || 0,
        paper.tldr || null,
        JSON.stringify(paper.tags || []),
        paper.bibtex || null,
        paper.notesMarkdown || null
      ).run();
      return paper;
    }
    const idx = memoryStore.papers.findIndex(p => p.id === paper.id);
    if (idx >= 0) memoryStore.papers[idx] = paper;
    else memoryStore.papers.unshift(paper);
    syncMemoryStore();
    return paper;
  }

  async deletePaper(id: string): Promise<boolean> {
    if (this.d1) {
      await this.d1.prepare('DELETE FROM papers WHERE id = ?').bind(id).run();
      return true;
    }
    memoryStore.papers = memoryStore.papers.filter(p => p.id !== id);
    syncMemoryStore();
    return true;
  }

  // --- CONFERENCES ---
  async getConferences(): Promise<Conference[]> {
    if (this.d1) {
      const { results } = await this.d1.prepare('SELECT * FROM conferences ORDER BY submission_deadline ASC').all();
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
      await this.d1.prepare(`
        INSERT INTO conferences (id, name, acronym, tier, abstract_deadline, submission_deadline, rebuttal_deadline, camera_ready_deadline, paper_title, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          acronym = excluded.acronym,
          tier = excluded.tier,
          abstract_deadline = excluded.abstract_deadline,
          submission_deadline = excluded.submission_deadline,
          rebuttal_deadline = excluded.rebuttal_deadline,
          camera_ready_deadline = excluded.camera_ready_deadline,
          paper_title = excluded.paper_title,
          status = excluded.status
      `).bind(
        conf.id,
        conf.name,
        conf.acronym,
        conf.tier || 'A*',
        conf.abstractDeadline || null,
        conf.submissionDeadline,
        conf.rebuttalDeadline || null,
        conf.cameraReadyDeadline || null,
        conf.paperTitle || null,
        conf.status || 'preparing'
      ).run();
      return conf;
    }
    const idx = memoryStore.conferences.findIndex(c => c.id === conf.id);
    if (idx >= 0) memoryStore.conferences[idx] = conf;
    else memoryStore.conferences.push(conf);
    syncMemoryStore();
    return conf;
  }

  async deleteConference(id: string): Promise<boolean> {
    if (this.d1) {
      await this.d1.prepare('DELETE FROM conferences WHERE id = ?').bind(id).run();
      return true;
    }
    memoryStore.conferences = memoryStore.conferences.filter(c => c.id !== id);
    syncMemoryStore();
    return true;
  }

  // --- EXPERIMENT LOGS ---
  async getExperiments(): Promise<ExperimentLog[]> {
    if (this.d1) {
      const { results } = await this.d1.prepare('SELECT * FROM experiment_logs ORDER BY created_at DESC').all();
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
      await this.d1.prepare(`
        INSERT INTO experiment_logs (id, project_tag, name, hypothesis, dataset, hyperparameters_json, metrics_json, status, plot_r2_key, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          project_tag = excluded.project_tag,
          name = excluded.name,
          hypothesis = excluded.hypothesis,
          dataset = excluded.dataset,
          hyperparameters_json = excluded.hyperparameters_json,
          metrics_json = excluded.metrics_json,
          status = excluded.status,
          plot_r2_key = excluded.plot_r2_key,
          notes = excluded.notes
      `).bind(
        exp.id,
        exp.projectTag,
        exp.name,
        exp.hypothesis || null,
        exp.dataset || null,
        JSON.stringify(exp.hyperparameters || {}),
        JSON.stringify(exp.metrics || {}),
        exp.status || 'completed',
        exp.plotR2Key || null,
        exp.notes || null
      ).run();
      return exp;
    }
    const idx = memoryStore.experimentLogs.findIndex(e => e.id === exp.id);
    if (idx >= 0) memoryStore.experimentLogs[idx] = exp;
    else memoryStore.experimentLogs.unshift(exp);
    syncMemoryStore();
    return exp;
  }

  // --- ADVISOR MEETINGS ---
  async getMeetings(): Promise<AdvisorMeeting[]> {
    if (this.d1) {
      const { results } = await this.d1.prepare('SELECT * FROM advisor_meetings ORDER BY meeting_date DESC').all();
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
      await this.d1.prepare(`
        INSERT INTO advisor_meetings (id, meeting_date, agenda_markdown, discussion_notes, action_items_json, weekly_digest_markdown)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          meeting_date = excluded.meeting_date,
          agenda_markdown = excluded.agenda_markdown,
          discussion_notes = excluded.discussion_notes,
          action_items_json = excluded.action_items_json,
          weekly_digest_markdown = excluded.weekly_digest_markdown
      `).bind(
        meeting.id,
        meeting.meetingDate,
        meeting.agendaMarkdown || null,
        meeting.discussionNotes || null,
        JSON.stringify(meeting.actionItems || []),
        meeting.weeklyDigestMarkdown || null
      ).run();
      return meeting;
    }
    const idx = memoryStore.advisorMeetings.findIndex(m => m.id === meeting.id);
    if (idx >= 0) memoryStore.advisorMeetings[idx] = meeting;
    else memoryStore.advisorMeetings.unshift(meeting);
    syncMemoryStore();
    return meeting;
  }

  // --- EVENTS & ROUTINES ---
  async getEvents(semesterId?: string): Promise<ScheduleEvent[]> {
    if (!memoryStore.events) memoryStore.events = defaultWorkspaceData.events || [];
    if (semesterId) {
      return memoryStore.events.filter(e => e.semesterId === semesterId);
    }
    return memoryStore.events;
  }

  async saveEvent(event: ScheduleEvent): Promise<ScheduleEvent> {
    if (!memoryStore.events) memoryStore.events = defaultWorkspaceData.events || [];
    const idx = memoryStore.events.findIndex(e => e.id === event.id);
    if (idx >= 0) {
      memoryStore.events[idx] = event;
    } else {
      memoryStore.events.push(event);
    }
    syncMemoryStore();
    return event;
  }

  async deleteEvent(id: string): Promise<void> {
    if (!memoryStore.events) memoryStore.events = defaultWorkspaceData.events || [];
    memoryStore.events = memoryStore.events.filter(e => e.id !== id);
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
    };
  }

  async importAll(data: Partial<WorkspaceData>): Promise<void> {
    if (data.semesters) for (const s of data.semesters) await this.saveSemester(s);
    if (data.timeSlots) await this.saveTimeSlots(data.timeSlots);
    if (data.courses) for (const c of data.courses) await this.saveCourse(c);
    if (data.events) {
      memoryStore.events = [];
      for (const e of data.events) await this.saveEvent(e);
    }
    if (data.tasks) for (const t of data.tasks) await this.saveTask(t);
    if (data.kanban) for (const k of data.kanban) await this.saveKanban(k);
    if (data.papers) for (const p of data.papers) await this.savePaper(p);
    if (data.conferences) for (const c of data.conferences) await this.saveConference(c);
    if (data.experimentLogs) for (const e of data.experimentLogs) await this.saveExperiment(e);
    if (data.advisorMeetings) for (const m of data.advisorMeetings) await this.saveMeeting(m);
    syncMemoryStore();
  }
}
