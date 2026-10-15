export interface Semester {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  totalWeeks: number;
  isActive: boolean;
  isArchived: boolean;
}

export interface TimeSlot {
  id?: string;
  session: string; // '1-2', '3-4', '5-6', '7-8', '9-10'
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  displayOrder?: number;
}

export interface CourseSchedule {
  id?: string;
  courseId?: string;
  dayOfWeek: number; // 1 = Mon .. 7 = Sun
  sessions: string[]; // ['5-6', '7-8']
  startTime: string;
  endTime: string;
}

export interface Course {
  id: string;
  semesterId: string;
  code: string;
  name: string;
  teacher?: string;
  location: string;
  color: string;
  activeWeeks: number[]; // [1, 2, 3, ...]
  schedules: CourseSchedule[];
}

export type EventType = 'routine' | 'event';

export interface ScheduleEvent {
  id: string;
  semesterId: string;
  title: string;
  type: EventType; // 'routine' (repeating weekly habit) | 'event' (one-off date)
  category?: 'Study' | 'Fitness' | 'Meeting' | 'Exam' | 'Personal' | string;
  daysOfWeek: number[]; // 1 = Mon .. 7 = Sun
  specificDate?: string; // YYYY-MM-DD for one-off events
  sessions?: string[]; // Snapped sessions e.g. ['1-2'] or empty
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location?: string;
  notes?: string;
  color: string;
  activeWeeks?: number[]; // [1..19] for routines
}

export interface Task {
  id: string;
  semesterId?: string;
  title: string;
  category: 'Research' | 'Coursework' | 'Writing' | string;
  tags: string[]; // ['#Research', '#Paper', '#Class']
  dueDate: string; // YYYY-MM-DD
  status: 'in_progress' | 'completed' | 'archived';
  completedAt?: string; // ISO date string when marked done
  archivedAt?: string;  // ISO date string when archived
  priority?: 'low' | 'medium' | 'high';
  linkedPaperId?: string;
  linkedMilestoneId?: string;
}

export type KanbanStage = 'lit_review' | 'experiments' | 'drafting' | 'under_review';

export interface KanbanMilestone {
  id: string;
  semesterId?: string;
  title: string;
  stage: KanbanStage;
  targetWeek: string; // 'W5'
  project: string; // 'Graph-RAG Paper'
  notes?: string;
  sortOrder?: number;
}

export interface Paper {
  id: string;
  title: string;
  authors?: string;
  venue?: string;
  year?: number;
  arxivId?: string;
  pdfR2Key?: string;
  codeUrl?: string;
  status: 'to_read' | 'reading' | 'read' | 'replicated';
  rating: number; // 1-5
  tldr?: string;
  tags: string[];
  bibtex?: string;
  notesMarkdown?: string;
}

export interface AdvisorMeeting {
  id: string;
  meetingDate: string; // YYYY-MM-DD
  agendaMarkdown?: string;
  discussionNotes?: string;
  actionItems: string[];
  weeklyDigestMarkdown?: string;
}

export interface Conference {
  id: string;
  name: string;
  acronym: string;
  tier?: string;
  abstractDeadline?: string;
  submissionDeadline: string; // YYYY-MM-DD or ISO
  rebuttalDeadline?: string;
  cameraReadyDeadline?: string;
  paperTitle?: string;
  status: 'preparing' | 'submitted' | 'rebuttal' | 'accepted' | 'rejected';
}

export interface ExperimentLog {
  id: string;
  projectTag: string;
  name: string;
  hypothesis?: string;
  dataset?: string;
  hyperparameters?: Record<string, any>;
  metrics?: Record<string, any>;
  status: 'queued' | 'running' | 'completed' | 'failed';
  plotR2Key?: string;
  notes?: string;
}

export interface WorkspaceData {
  semesters: Semester[];
  timeSlots: TimeSlot[];
  courses: Course[];
  events?: ScheduleEvent[];
  tasks: Task[];
  kanban: KanbanMilestone[];
  papers: Paper[];
  advisorMeetings: AdvisorMeeting[];
  conferences: Conference[];
  experimentLogs: ExperimentLog[];
}
