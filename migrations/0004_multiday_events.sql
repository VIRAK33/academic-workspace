-- 4. Support multi-day events and all-day events
ALTER TABLE schedule_events ADD COLUMN end_date TEXT;
ALTER TABLE schedule_events ADD COLUMN is_all_day INTEGER DEFAULT 0;
