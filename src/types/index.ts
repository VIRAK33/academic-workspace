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
  endDate?: string; // YYYY-MM-DD for multi-day one-off events (inclusive)
  isAllDay?: boolean; // true if event spans all day without specific fixed hours
  sessions?: string[]; // Snapped sessions e.g. ['1-2'] or empty
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location?: string;
  notes?: string;
  color: string;
  activeWeeks?: number[]; // [1..19] for routines
}

export type CommitmentStatus = 'attended' | 'missed' | 'excused';

export interface AttendanceRecord {
  id: string; // `att_${targetType}_${targetId}_${date}`
  targetId: string;
  targetType: 'course' | 'routine' | 'event';
  date: string; // YYYY-MM-DD
  status: CommitmentStatus;
  academicWeek?: number;
  note?: string;
  updatedAt: string;
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

export type KanbanStage =
  | 'lit_review'
  | 'experiments'
  | 'drafting'
  | 'under_review'
  | 'todo'
  | 'in_progress'
  | 'review'
  | 'done';

export type KanbanPriority = 'urgent' | 'high' | 'medium' | 'low';
export type KanbanIssueType = 'experiment' | 'writing' | 'reading' | 'code' | 'coursework';

export interface SubtaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export type SprintStatus = 'planned' | 'active' | 'completed';

export interface SprintAutomationPolicies {
  autoCloseOnEndDate?: boolean;
  carryOverUnfinished?: boolean;
  requireArtifactForDone?: boolean;
}

export interface SprintStreamAllocation {
  id: string;
  stream: string;
  name?: string;
  points: number;
}

export interface Sprint {
  id: string;
  semesterId?: string;
  name: string; // e.g. 'Sprint 1: Baseline & Lit Review'
  goal?: string; // e.g. 'Complete baseline evaluation and finish Chapter 3 draft'
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: SprintStatus;
  completedAt?: string;
  velocityPoints?: number;
  retrospective?: string;
  maxCapacity?: number; // Target capacity ceiling in SP (e.g. 45)
  isPaused?: boolean;
  policies?: SprintAutomationPolicies;
  streamAllocations?: SprintStreamAllocation[];
  shippedHighlights?: { issueKey: string; title: string }[];
}

export interface IssueUser {
  name: string;
  avatar?: string;
  role?: string;
}

export interface ConnectedArtifact {
  title: string;
  url?: string;
  type: 'figma' | 'pr' | 'paper' | 'link';
  status?: string;
}

export interface IssueAttachment {
  id: string;
  name: string;
  sizeBytes: number;
  category: 'image' | 'data' | 'design' | 'doc';
  mimeType?: string;
  url?: string;
  dataUrl?: string;
  uploadedAt: string;
  tag?: string;
  verified?: boolean;
}

export interface IssueComment {
  id: string;
  author: string;
  avatar?: string;
  createdAt: string;
  text: string;
  reactions?: Record<string, number>;
}

export interface KanbanMilestone {
  id: string;
  issueKey?: string; // e.g. 'SPR-104' or auto-assigned
  semesterId?: string;
  sprintId?: string; // undefined or '' or 'backlog' = Backlog
  title: string;
  stage: KanbanStage;
  targetWeek: string; // 'W5'
  project: string; // 'Graph-RAG Paper'
  notes?: string;
  sortOrder?: number;
  priority?: KanbanPriority;
  issueType?: KanbanIssueType;
  storyPoints?: number; // 1, 2, 3, 5, 8
  isBlocked?: boolean;
  blockedReason?: string;
  subtasks?: SubtaskItem[];
  assignee?: IssueUser;
  reporter?: IssueUser;
  connectedArtifacts?: ConnectedArtifact[];
  attachments?: IssueAttachment[];
  comments?: IssueComment[];
  completedNote?: string;
  completedAt?: string; // ISO string when marked done
  createdAt?: string;
  tags?: string[];
  isArchived?: boolean;
  archiveReason?: 'wont_fix' | 'parked' | 'completed' | 'duplicate';
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
  sprints?: Sprint[];
  kanban: KanbanMilestone[];
  papers: Paper[];
  advisorMeetings: AdvisorMeeting[];
  conferences: Conference[];
  experimentLogs: ExperimentLog[];
  attendanceRecords?: AttendanceRecord[];
}

export interface User {
  id: string;
  googleSub: string;
  email: string;
  name: string;
  picture?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  createdAt?: string;
}

