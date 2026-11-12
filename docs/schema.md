# Database schema

PostgreSQL. Defined in [`db/schema.sql`](../db/schema.sql); applied by `npm run db:migrate`.

## Enum types

| Type | Values |
| --- | --- |
| `user_role` | `learner`, `contributor`, `moderator`, `admin` |
| `resource_type` | `video`, `article`, `game`, `simulation`, `problem_set`, `application`, `course`, `book` |
| `content_status` | `pending`, `approved`, `rejected` |
| `difficulty` | `beginner`, `intermediate`, `advanced` |
| `item_status` | `not_started`, `in_progress`, `completed` |

## Tables

### `users`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | serial PK | |
| `name` | text | |
| `email` | text | unique |
| `password_hash` | text | `scrypt$…` |
| `role` | `user_role` | default `learner` |
| `bio` | text | |
| `created_at` | timestamptz | |

### `branches`
The six subject areas: `id`, `slug` (unique), `name`, `tagline`, `description`, `color`, `icon`, `sort_order`.

### `topics`
A concept node: `id`, `branch_id` → branches, `slug` (unique), `title`, `summary`,
`difficulty_level` (1–5, checked), `tags` (`text[]`, GIN indexed), `est_minutes`, `created_at`.

### `topic_prerequisites`
DAG edges. `topic_id`, `prerequisite_topic_id`, primary key on both, `CHECK (topic_id <> prerequisite_topic_id)`.
Read as *“topic requires prerequisite”*.

### `resources`
Community learning resources: `id`, `title`, `url`, `type` (`resource_type`), `description`, `provider`,
`submitted_by` → users (nullable for seeded content), `status` (`content_status`, default `pending`), `created_at`.

### `resource_topics`
Many-to-many link so one resource can serve several concepts: `resource_id`, `topic_id` (composite PK).

### `resource_votes`
`user_id`, `resource_id`, `value` (`+1`/`-1`, checked), composite PK, `created_at` — one vote per user per
resource, so voting is idempotent and easy to toggle.

### `problems`
`id`, `topic_id` → topics, `title`, `statement`, `hint`, `solution`, `difficulty_level` (1–5),
`source_url`, `submitted_by`, `status`, `created_at`.

### `roadmaps`
A saved personalized path: `id`, `user_id` → users, `title`, `goal`, `level` (`difficulty`),
`branch_ids` (`int[]`), `interest_tags` (`text[]`), `length`, `is_saved`, `created_at`.

### `roadmap_items`
Ordered topics inside a roadmap: `id`, `roadmap_id` → roadmaps, `topic_id` → topics, `order_index`,
`status` (`item_status`), `completed_at`, `UNIQUE (roadmap_id, topic_id)`.

### `moderation_log`
Audit trail: `id`, `entity_type` (`resource`/`problem`), `entity_id`, `action` (`approve`/`reject`),
`moderator_id` → users, `reason`, `created_at`.

## Trigger

`trg_roadmap_items_completed` (BEFORE UPDATE on `roadmap_items`) calls `set_completed_at()`, which sets
`completed_at = now()` when a row transitions to `completed` and clears it otherwise — so timestamps can
never drift from the status.

## Views

| View | Purpose |
| --- | --- |
| `v_community_stats` | Single-row counts (branches, topics, resources, problems, members, votes) for the landing page. |
| `v_topic_resource_counts` | Per-topic approved resource and problem counts (correlated subqueries, so no join fan-out). |
| `v_resource_scores` | Each resource with `net_votes` and `vote_count`, used for ranking everywhere. |

## Indexes

Foreign keys plus: `topics(branch_id)`, `topics USING GIN(tags)`, `resources(status)`, `resources(type)`,
`problems(status)`, `roadmaps(user_id)`, `roadmap_items(roadmap_id)`, `moderation_log(entity_type, entity_id)`.

## Seeded content

`npm run db:seed` truncates and reloads: 6 branches · 66 topics · 67 prerequisite edges ·
120 approved resources + 4 pending · 58 approved problems + 3 pending · 12 users with 737 votes ·
3 generated sample roadmaps (one with partial progress).
