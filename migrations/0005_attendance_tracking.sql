-- 5. Attendance & Routine Completion Records
CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'course' | 'routine' | 'event'
  date TEXT NOT NULL,        -- YYYY-MM-DD
  status TEXT NOT NULL,      -- 'attended' | 'missed' | 'excused'
  academic_week INTEGER,
  note TEXT,
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_attendance_target_date ON attendance_records (target_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance_records (user_id);
