CREATE TABLE task_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL CHECK (length(btrim(label)) > 0),
  description TEXT NOT NULL,
  color TEXT NOT NULL CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  display_order INTEGER NOT NULL UNIQUE,
  is_complete BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE task_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL CHECK (length(btrim(label)) > 0),
  color TEXT NOT NULL CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  display_order INTEGER NOT NULL UNIQUE
);
INSERT INTO task_statuses (label, description, color, display_order, is_complete) VALUES
  ('To Do', 'A clear starting point for your next idea.', '#65738a', 1, FALSE),
  ('In Progress', 'Good things happen one step at a time.', '#5263e8', 2, FALSE),
  ('Done', 'A little progress worth celebrating.', '#238265', 3, TRUE);
INSERT INTO task_priorities (label, color, display_order) VALUES
  ('High', '#b94444', 1), ('Medium', '#926221', 2), ('Low', '#426b90', 3);

CREATE TABLE board_settings (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  brand_name TEXT NOT NULL CHECK (length(btrim(brand_name)) > 0),
  board_name TEXT NOT NULL CHECK (length(btrim(board_name)) > 0),
  description TEXT NOT NULL,
  default_status_id UUID NOT NULL REFERENCES task_statuses(id) ON DELETE RESTRICT,
  default_priority_id UUID NOT NULL REFERENCES task_priorities(id) ON DELETE RESTRICT,
  title_max_length INTEGER NOT NULL CHECK (title_max_length BETWEEN 1 AND 1000),
  description_max_length INTEGER NOT NULL CHECK (description_max_length BETWEEN 0 AND 20000),
  motion_enabled BOOLEAN NOT NULL,
  motion_duration_ms INTEGER NOT NULL CHECK (motion_duration_ms BETWEEN 0 AND 1000),
  motion_stagger_ms INTEGER NOT NULL CHECK (motion_stagger_ms BETWEEN 0 AND 100),
  motion_easing TEXT NOT NULL CHECK (motion_easing IN ('none', 'power1.out', 'power2.out', 'power3.out', 'power2.inOut'))
);
INSERT INTO board_settings VALUES (
  TRUE, 'Dayboard', 'Your task board', 'A little clarity. A lot of progress.',
  (SELECT id FROM task_statuses WHERE display_order = 1),
  (SELECT id FROM task_priorities WHERE display_order = 2),
  120, 2000, TRUE, 220, 35, 'power2.out'
);
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) > 0 AND title = btrim(title)),
  description TEXT NOT NULL,
  status_id UUID NOT NULL REFERENCES task_statuses(id) ON DELETE RESTRICT,
  priority_id UUID NOT NULL REFERENCES task_priorities(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (updated_at >= created_at)
);
CREATE INDEX tasks_created_at_id_idx ON tasks(created_at, id);
CREATE INDEX tasks_status_id_idx ON tasks(status_id);
CREATE INDEX tasks_priority_id_idx ON tasks(priority_id);

-- SHARE locks serialize task validation with concurrent settings changes.
CREATE FUNCTION validate_task_limits() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE settings board_settings%ROWTYPE;
BEGIN
  SELECT * INTO STRICT settings FROM board_settings WHERE singleton FOR SHARE;
  IF char_length(NEW.title) > settings.title_max_length OR
     char_length(NEW.description) > settings.description_max_length THEN
    RAISE EXCEPTION 'Task exceeds configured limits' USING ERRCODE = '23514', CONSTRAINT = 'tasks_configured_limits';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER tasks_validate_limits BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION validate_task_limits();

CREATE FUNCTION protect_board_limits() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM tasks WHERE char_length(title) > NEW.title_max_length OR
    char_length(description) > NEW.description_max_length) THEN
    RAISE EXCEPTION 'Existing tasks exceed proposed limits' USING ERRCODE = '23514', CONSTRAINT = 'board_existing_task_limits';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER board_protect_limits BEFORE UPDATE OF title_max_length, description_max_length ON board_settings
  FOR EACH ROW EXECUTE FUNCTION protect_board_limits();

-- The local bootstrap creates this role; integration/CI databases use their own owner.
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'task_board_app') THEN
    GRANT USAGE ON SCHEMA public TO task_board_app;
    GRANT SELECT ON task_statuses, task_priorities, board_settings, tasks TO task_board_app;
    GRANT INSERT, UPDATE, DELETE ON tasks TO task_board_app;
  END IF;
END $$;
