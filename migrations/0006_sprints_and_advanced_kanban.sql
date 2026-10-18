-- Migration: 0006_sprints_and_advanced_kanban.sql
-- Description: Dedicated sprints table and advanced kanban columns for full Agile workflow and real D1 persistence

-- 1. Dedicated Sprints Table
CREATE TABLE IF NOT EXISTS sprints (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  semester_id TEXT REFERENCES semesters(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  goal TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned', -- 'planned' | 'active' | 'completed'
  completed_at DATETIME,
  velocity_points INTEGER DEFAULT 0,
  retrospective TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sprints_user ON sprints(user_id);
CREATE INDEX IF NOT EXISTS idx_sprints_sem ON sprints(semester_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);

-- 2. Enhanced kanban_milestones columns
-- SQLite ALTER TABLE ADD COLUMN adds columns if they do not exist
ALTER TABLE kanban_milestones ADD COLUMN sprint_id TEXT REFERENCES sprints(id) ON DELETE SET NULL;
ALTER TABLE kanban_milestones ADD COLUMN issue_key TEXT;
ALTER TABLE kanban_milestones ADD COLUMN priority TEXT DEFAULT 'medium';
ALTER TABLE kanban_milestones ADD COLUMN issue_type TEXT DEFAULT 'experiment';
ALTER TABLE kanban_milestones ADD COLUMN story_points INTEGER DEFAULT 1;
ALTER TABLE kanban_milestones ADD COLUMN is_blocked INTEGER DEFAULT 0;
ALTER TABLE kanban_milestones ADD COLUMN blocked_reason TEXT;
ALTER TABLE kanban_milestones ADD COLUMN subtasks_json TEXT DEFAULT '[]';
ALTER TABLE kanban_milestones ADD COLUMN connected_artifacts_json TEXT DEFAULT '[]';
ALTER TABLE kanban_milestones ADD COLUMN comments_json TEXT DEFAULT '[]';
ALTER TABLE kanban_milestones ADD COLUMN completed_at DATETIME;

CREATE INDEX IF NOT EXISTS idx_kanban_sprint ON kanban_milestones(sprint_id);
CREATE INDEX IF NOT EXISTS idx_kanban_stage ON kanban_milestones(stage);
