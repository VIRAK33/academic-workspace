-- 1. Semesters & Term Management
CREATE TABLE IF NOT EXISTS semesters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL, -- YYYY-MM-DD
  total_weeks INTEGER NOT NULL DEFAULT 19,
  is_active INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. University Session Time Slots
CREATE TABLE IF NOT EXISTS time_slots (
  id TEXT PRIMARY KEY,
  session_code TEXT NOT NULL, -- e.g. '1-2', '3-4', '5-6', '7-8', '9-10'
  start_time TEXT NOT NULL,   -- e.g. '08:25'
  end_time TEXT NOT NULL,     -- e.g. '10:00'
  display_order INTEGER NOT NULL DEFAULT 0
);

-- 3. Courses & Timetable
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  teacher TEXT,
  location TEXT,
  color TEXT DEFAULT '#2563EB',
  active_weeks_json TEXT NOT NULL, -- JSON array: [1,2,3,4,...]
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_schedules (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 1=Mon .. 7=Sun
  sessions_json TEXT NOT NULL,   -- JSON array: ["5-6", "7-8"]
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL
);

-- 4. Tasks & To-Dos
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  semester_id TEXT REFERENCES semesters(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Research', -- 'Research', 'Coursework', 'Writing'
  tags_json TEXT DEFAULT '[]',      -- JSON array: ["#Research", "#Paper"]
  due_date TEXT NOT NULL,           -- YYYY-MM-DD
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed'
  priority TEXT DEFAULT 'medium',   -- 'low', 'medium', 'high'
  linked_paper_id TEXT,
  linked_milestone_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Research Kanban Milestones
CREATE TABLE IF NOT EXISTS kanban_milestones (
  id TEXT PRIMARY KEY,
  semester_id TEXT REFERENCES semesters(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  stage TEXT NOT NULL, -- 'lit_review', 'experiments', 'drafting', 'under_review'
  target_week TEXT NOT NULL, -- e.g. 'W6'
  project TEXT NOT NULL,     -- e.g. 'Graph-RAG Paper'
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Literature & Paper Matrix
CREATE TABLE IF NOT EXISTS papers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  authors TEXT,
  venue TEXT, -- e.g. 'NeurIPS 2025'
  year INTEGER,
  arxiv_id TEXT,
  pdf_r2_key TEXT, -- key pointing to Cloudflare R2 bucket
  code_url TEXT,
  status TEXT NOT NULL DEFAULT 'to_read', -- 'to_read', 'reading', 'read', 'replicated'
  rating INTEGER DEFAULT 0, -- 1-5 stars
  tldr TEXT,
  tags_json TEXT DEFAULT '[]',
  bibtex TEXT,
  notes_markdown TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Advisor Meetings & Weekly Reports
CREATE TABLE IF NOT EXISTS advisor_meetings (
  id TEXT PRIMARY KEY,
  meeting_date TEXT NOT NULL, -- YYYY-MM-DD
  agenda_markdown TEXT,
  discussion_notes TEXT,
  action_items_json TEXT DEFAULT '[]', -- JSON array of action points
  weekly_digest_markdown TEXT,         -- Generated 1-click summary
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Conferences & Deadlines Tracker
CREATE TABLE IF NOT EXISTS conferences (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,           -- e.g. 'NeurIPS 2027'
  acronym TEXT NOT NULL,        -- 'NeurIPS'
  tier TEXT DEFAULT 'A*',       -- 'CCF-A', 'A*', 'Core A', etc.
  abstract_deadline TEXT,       -- ISO timestamp or date
  submission_deadline TEXT NOT NULL, -- Full paper deadline
  rebuttal_deadline TEXT,
  camera_ready_deadline TEXT,
  paper_title TEXT,             -- Linked paper in drafting
  status TEXT DEFAULT 'preparing', -- 'preparing', 'submitted', 'rebuttal', 'accepted', 'rejected'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Experiment Run Logs
CREATE TABLE IF NOT EXISTS experiment_logs (
  id TEXT PRIMARY KEY,
  project_tag TEXT NOT NULL,
  name TEXT NOT NULL,           -- e.g. '3-Hop Contrastive Ablation with k=16'
  hypothesis TEXT,
  dataset TEXT,                 -- e.g. 'HotpotQA + MuSiQue'
  hyperparameters_json TEXT,    -- JSON configuration
  metrics_json TEXT,            -- JSON: {"f1": 84.2, "latency_ms": 112}
  status TEXT DEFAULT 'completed', -- 'queued', 'running', 'completed', 'failed'
  plot_r2_key TEXT,             -- R2 file path for loss/metric chart
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
