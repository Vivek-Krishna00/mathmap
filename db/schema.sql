-- ============================================================================
-- MathMap - PostgreSQL schema
-- ----------------------------------------------------------------------------
-- Re-runnable: drops and recreates all application objects.
-- Run with:  npm run db:migrate   (see server/src/db/migrate.js)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('learner', 'contributor', 'moderator', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE resource_type AS ENUM (
    'video', 'article', 'game', 'simulation',
    'problem_set', 'application', 'course', 'book'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE content_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE difficulty AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE item_status AS ENUM ('not_started', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Drop existing tables / views (reverse dependency order)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS v_resource_scores CASCADE;
DROP VIEW IF EXISTS v_topic_resource_counts CASCADE;
DROP VIEW IF EXISTS v_community_stats CASCADE;

DROP TABLE IF EXISTS moderation_log CASCADE;
DROP TABLE IF EXISTS roadmap_items CASCADE;
DROP TABLE IF EXISTS roadmaps CASCADE;
DROP TABLE IF EXISTS problems CASCADE;
DROP TABLE IF EXISTS placement_questions CASCADE;
DROP TABLE IF EXISTS topic_notes CASCADE;
DROP TABLE IF EXISTS track_topics CASCADE;
DROP TABLE IF EXISTS tracks CASCADE;
DROP TABLE IF EXISTS resource_votes CASCADE;
DROP TABLE IF EXISTS resource_topics CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS topic_prerequisites CASCADE;
DROP TABLE IF EXISTS topics CASCADE;
DROP TABLE IF EXISTS branches CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  role          user_role   NOT NULL DEFAULT 'learner',
  bio           TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE branches (
  id          SERIAL PRIMARY KEY,
  slug        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  tagline     TEXT    NOT NULL DEFAULT '',
  description TEXT    NOT NULL DEFAULT '',
  color       TEXT    NOT NULL DEFAULT '#6366f1',
  icon        TEXT    NOT NULL DEFAULT 'sigma',
  sort_order  INT     NOT NULL DEFAULT 0
);

CREATE TABLE topics (
  id               SERIAL PRIMARY KEY,
  branch_id        INT         NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  slug             TEXT        NOT NULL UNIQUE,
  title            TEXT        NOT NULL,
  summary          TEXT        NOT NULL DEFAULT '',
  difficulty_level SMALLINT    NOT NULL DEFAULT 3 CHECK (difficulty_level BETWEEN 1 AND 5),
  tags             TEXT[]      NOT NULL DEFAULT '{}',
  est_minutes      INT         NOT NULL DEFAULT 30,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Directed edges of the concept DAG: topic requires prerequisite.
CREATE TABLE topic_prerequisites (
  topic_id              INT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  prerequisite_topic_id INT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (topic_id, prerequisite_topic_id),
  CHECK (topic_id <> prerequisite_topic_id)
);

CREATE TABLE resources (
  id           SERIAL PRIMARY KEY,
  title        TEXT           NOT NULL,
  url          TEXT           NOT NULL,
  type         resource_type  NOT NULL,
  description  TEXT           NOT NULL DEFAULT '',
  provider     TEXT           NOT NULL DEFAULT '',
  submitted_by INT            REFERENCES users(id) ON DELETE SET NULL,
  status       content_status NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE TABLE resource_topics (
  resource_id INT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  topic_id    INT NOT NULL REFERENCES topics(id)    ON DELETE CASCADE,
  PRIMARY KEY (resource_id, topic_id)
);

CREATE TABLE resource_votes (
  user_id     INT         NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  resource_id INT         NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  value       SMALLINT    NOT NULL CHECK (value IN (-1, 1)),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, resource_id)
);

CREATE TABLE problems (
  id               SERIAL PRIMARY KEY,
  topic_id         INT            NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  title            TEXT           NOT NULL,
  statement        TEXT           NOT NULL,
  hint             TEXT           NOT NULL DEFAULT '',
  solution         TEXT           NOT NULL DEFAULT '',
  difficulty_level SMALLINT       NOT NULL DEFAULT 3 CHECK (difficulty_level BETWEEN 1 AND 5),
  source_url       TEXT           NOT NULL DEFAULT '',
  submitted_by     INT            REFERENCES users(id) ON DELETE SET NULL,
  status           content_status NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- Applied goals. A track is a real-world destination (cryptography, game dev, MLOps)
-- mapped onto the existing maths graph, so the same 66 concepts serve many goals
-- without duplicating content.
CREATE TABLE tracks (
  id          SERIAL PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  tagline     TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  icon        TEXT NOT NULL DEFAULT 'target',
  color       TEXT NOT NULL DEFAULT '#1B4F8F',
  sort_order  INT  NOT NULL DEFAULT 0
);

CREATE TABLE track_topics (
  track_id INT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  topic_id INT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (track_id, topic_id)
);

-- Multiple-choice questions used by the placement self-check to infer a learner's
-- current level and interests, instead of making them guess their own ability.
CREATE TABLE placement_questions (
  id               SERIAL PRIMARY KEY,
  branch_id        INT      NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  prompt           TEXT     NOT NULL,
  options          TEXT[]   NOT NULL,
  correct_index    SMALLINT NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  difficulty_level SMALLINT NOT NULL DEFAULT 3 CHECK (difficulty_level BETWEEN 1 AND 5),
  explanation      TEXT     NOT NULL DEFAULT '',
  sort_order       INT      NOT NULL DEFAULT 0,
  CHECK (array_length(options, 1) = 4)
);

CREATE TABLE roadmaps (
  id            SERIAL PRIMARY KEY,
  user_id       INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT         NOT NULL,
  goal          TEXT         NOT NULL DEFAULT '',
  level         difficulty   NOT NULL DEFAULT 'beginner',
  branch_ids    INT[]        NOT NULL DEFAULT '{}',
  track_ids     INT[]        NOT NULL DEFAULT '{}',
  interest_tags TEXT[]       NOT NULL DEFAULT '{}',
  length        TEXT         NOT NULL DEFAULT 'medium',
  is_saved      BOOLEAN      NOT NULL DEFAULT true,
  share_token   TEXT         UNIQUE,
  is_public     BOOLEAN      NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE roadmap_items (
  id          SERIAL PRIMARY KEY,
  roadmap_id  INT         NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  topic_id    INT         NOT NULL REFERENCES topics(id)   ON DELETE CASCADE,
  order_index INT         NOT NULL,
  status      item_status NOT NULL DEFAULT 'not_started',
  completed_at TIMESTAMPTZ,
  last_reviewed_at TIMESTAMPTZ,
  review_count INT        NOT NULL DEFAULT 0,
  UNIQUE (roadmap_id, topic_id)
);

-- A learner's private notes and bookmarks for a concept.
CREATE TABLE topic_notes (
  id         SERIAL PRIMARY KEY,
  user_id    INT         NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  topic_id   INT         NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  body       TEXT        NOT NULL DEFAULT '',
  bookmarked BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id)
);

CREATE TABLE moderation_log (
  id           SERIAL PRIMARY KEY,
  entity_type  TEXT        NOT NULL,
  entity_id    INT         NOT NULL,
  action       TEXT        NOT NULL,
  moderator_id INT         REFERENCES users(id) ON DELETE SET NULL,
  reason       TEXT        NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_topics_branch          ON topics(branch_id);
CREATE INDEX idx_topics_tags            ON topics USING GIN(tags);
CREATE INDEX idx_prereq_prerequisite    ON topic_prerequisites(prerequisite_topic_id);
CREATE INDEX idx_resources_status       ON resources(status);
CREATE INDEX idx_resources_type         ON resources(type);
CREATE INDEX idx_resource_topics_topic  ON resource_topics(topic_id);
CREATE INDEX idx_resource_votes_res     ON resource_votes(resource_id);
CREATE INDEX idx_problems_topic         ON problems(topic_id);
CREATE INDEX idx_problems_status        ON problems(status);
CREATE INDEX idx_placement_branch       ON placement_questions(branch_id);
CREATE INDEX idx_track_topics_topic      ON track_topics(topic_id);
CREATE INDEX idx_roadmaps_user          ON roadmaps(user_id);
CREATE INDEX idx_roadmap_items_roadmap  ON roadmap_items(roadmap_id);
CREATE INDEX idx_topic_notes_user       ON topic_notes(user_id);
CREATE INDEX idx_topic_notes_bookmarked ON topic_notes(user_id) WHERE bookmarked;
CREATE INDEX idx_moderation_log_entity  ON moderation_log(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Trigger: keep roadmap_items.completed_at in sync with status
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_completed_at() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at := now();
  ELSIF NEW.status <> 'completed' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_roadmap_items_completed
BEFORE UPDATE ON roadmap_items
FOR EACH ROW EXECUTE FUNCTION set_completed_at();

-- ---------------------------------------------------------------------------
-- Reporting views
-- ---------------------------------------------------------------------------
CREATE VIEW v_community_stats AS
SELECT
  (SELECT count(*) FROM branches)                                  AS branches,
  (SELECT count(*) FROM topics)                                    AS topics,
  (SELECT count(*) FROM resources WHERE status = 'approved')       AS resources,
  (SELECT count(*) FROM problems  WHERE status = 'approved')       AS problems,
  (SELECT count(*) FROM users)                                     AS members,
  (SELECT count(*) FROM resource_votes)                            AS votes;

CREATE VIEW v_topic_resource_counts AS
SELECT
  t.id AS topic_id,
  t.slug,
  t.title,
  t.branch_id,
  (SELECT count(*) FROM resource_topics rt
     JOIN resources r ON r.id = rt.resource_id
   WHERE rt.topic_id = t.id AND r.status = 'approved')             AS resource_count,
  (SELECT count(*) FROM problems p
   WHERE p.topic_id = t.id AND p.status = 'approved')              AS problem_count
FROM topics t;

CREATE VIEW v_resource_scores AS
SELECT
  r.id AS resource_id,
  r.id, r.title, r.url, r.type, r.description, r.provider,
  r.submitted_by, r.status, r.created_at,
  COALESCE(sum(v.value), 0)::int AS net_votes,
  count(v.user_id)::int          AS vote_count
FROM resources r
LEFT JOIN resource_votes v ON v.resource_id = r.id
GROUP BY r.id;
