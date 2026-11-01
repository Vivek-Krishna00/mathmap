# API reference

Base URL: `/api`. All requests and responses are JSON.
Authenticated endpoints expect `Authorization: Bearer <token>`.

Errors are returned as `{ "error": "message" }` with an appropriate status code
(`400` validation, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict, `429` rate limited).

---

## Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | – | `{ status, db, env, time }` |

## Auth

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | – | Body `{ name, email, password, bio? }` → `{ token, user }`. New accounts are `learner`. |
| `POST` | `/auth/login` | – | Body `{ email, password }` → `{ token, user }`. |
| `GET` | `/auth/me` | user | Returns the current `{ user }`. |

Passwords must contain a letter and a number and be at least 8 characters.

## Catalog

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/branches` | – | All branches with `topic_count` and `resource_count`. |
| `GET` | `/branches/:slug` | – | One branch plus its topics. |
| `GET` | `/topics` | – | Query: `branch`, `search`, `tag`, `difficulty`, `page`, `limit` → `{ topics, total, page, limit }`. |
| `GET` | `/topics/tags` | – | Most common topic tags with counts. |
| `GET` | `/topics/:slug` | optional | Topic with `prerequisites`, `dependents`, approved `resources` (each carrying the viewer's `my_vote`) and `problems`. |
| `GET` | `/topics/:slug/neighborhood` | – | 1-hop graph around a topic → `{ nodes, edges, center }`. |
| `GET` | `/graph` | – | Whole concept DAG. Query: `branches` (comma-separated slugs) → `{ nodes, edges }`. |

## Resources

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/resources` | optional | Query: `topic`, `type`, `limit`, `offset`. Approved resources with `net_votes`, `my_vote`, `topic_slugs`. |
| `GET` | `/resources/mine` | user | The caller's submissions in every status. |
| `POST` | `/resources` | user | Body `{ title, url, type, provider?, description?, topics[] }` → created with status `pending`. |
| `POST` | `/resources/:id/vote` | user | Body `{ value }` where value is `1` or `-1` (omit to cycle). Toggles, returns `{ resourceId, myVote, net_votes, vote_count }`. |

## Problems

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/problems` | – | Query: `topic`, `difficulty`, `limit`, `offset`. |
| `GET` | `/problems/:id` | – | One approved problem including its solution. |
| `POST` | `/problems` | user | Body `{ topic, title, statement, hint?, solution?, difficulty?, source_url? }` → status `pending`. |

## Placement self-check

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/placement/questions` | – | Up to 4 questions per branch. Query `branches` (comma-separated slugs) to narrow. Never returns `correct_index`. |
| `POST` | `/placement/score` | – | Body `{ answers: [{ questionId, choiceIndex }] }` → advised level, per-branch breakdown and suggested tags. |

Scoring is ratio-based: 0–25% correct → `beginner`, anything short of perfect → `intermediate`,
100% → `advanced`. Unanswered questions are ignored, so the check can be partial.

```json
{
  "result": {
    "totalCorrect": 5,
    "totalAnswered": 18,
    "advisedLevel": "intermediate",
    "branches": [{ "slug": "linear-algebra", "name": "Linear Algebra", "correct": 3, "total": 4, "advisedLevel": "intermediate" }],
    "suggestedBranchIds": [1, 2],
    "suggestedTags": ["matrices", "eigenvalues"]
  }
}
```

## Sharing

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/roadmaps/:id/share` | owner | Mints (or reuses) a share token and makes the roadmap public → `{ share: { shareToken, isPublic } }`. |
| `DELETE` | `/roadmaps/:id/share` | owner | Revokes: clears the token, so the old link 404s. |
| `GET` | `/shared/:token` | – | Public, read-only view → `{ roadmap, items, progress }`. No owner email is exposed. |

The token is the capability: it is 24 URL-safe characters from `crypto.randomBytes`, and a revoked or
unknown token is indistinguishable from a missing one (`404`).

## Roadmaps

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/roadmaps/preview` | – | Generate without saving → `{ roadmap }`. |
| `POST` | `/roadmaps` | user | Generate and save → `{ roadmap }` with `items` and `meta`. |
| `GET` | `/roadmaps` | user | The caller's roadmaps with `topic_count` and `completed_count`. |
| `GET` | `/roadmaps/:id` | owner/moderator/admin | `{ roadmap, items, progress }`; items carry `resources` (with `my_vote`). |
| `PATCH` | `/roadmaps/:id/items/:itemId` | owner | Body `{ status }` where status is `not_started` \| `in_progress` \| `completed`. |
| `DELETE` | `/roadmaps/:id` | owner | Deletes the roadmap and its items. |

Generation request body:

```json
{
  "branchIds": [1, 2],
  "level": "beginner",
  "goal": "understand matrices and eigenvalues for machine learning",
  "interestTags": ["matrices", "eigenvalues"],
  "length": "medium"
}
```

Response `meta` includes `candidateCount`, `selectedCount`, `requestedLength`, `averageDifficulty`,
`branchBreakdown`, `coverageByType`, `resourceCount` and `totalMinutes`.

## Notes & bookmarks — requires a signed-in user

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/notes` | The caller's notes and bookmarks, newest first (only rows with a body or a bookmark). |
| `GET` | `/notes/:slug` | One note, or an empty shell (`{ body: "", bookmarked: false }`). |
| `PUT` | `/notes/:slug` | Partial upsert: send `body`, `bookmarked`, or both. Omitted fields keep their value. |
| `DELETE` | `/notes/:slug` | Removes the note and bookmark. |

## Review queue — requires a signed-in user

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/review` | Completed topics that are due, with `review_count` and the next `interval_days`. |
| `POST` | `/review/:itemId` | Marks the roadmap item reviewed; increments `review_count` and stamps `last_reviewed_at`. |

The schedule widens with each review: **3 → 7 → 16 → 35 days**, then every 35 days.

## Insights — requires a signed-in user

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/insights/next` | Up to 5 topics the learner is ready for: every prerequisite is already completed. |
| `GET` | `/insights/analytics` | Completed/total topics per branch, plus overall totals. |
| `GET` | `/insights/graph` | The learner's actual path: per-topic state, completion order, prerequisite violations, review-due topics and an adherence percentage. |

**`/insights/graph`** aggregates across every roadmap the caller owns — a topic counts as completed
if it is completed anywhere, and the earliest completion date wins. A **violation** is a completed
topic that was finished *before* one of its prerequisites (including prerequisites never completed),
returned both as `violations` and as `violationEdges` pairs `[prerequisite, topic]` ready to
highlight on the map. `adherencePercent` is the share of completed topics studied in a valid order,
and is `null` when nothing is completed rather than dividing by zero.

"Ready for" is computed from the concept DAG, not from a list: a topic qualifies only when *all* of its
prerequisites appear in the learner's completed set. With nothing completed, the root concepts are
suggested.

## Goals — public

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/goals` | How the selected branches connect. Query `branches` (comma-separated slugs); omitting it uses all six. |

Returns `{ goals, bridges, bridgeCount }`.

- **`goals`** — one entry per selected branch with its `roots` (topics that have no prerequisites at
  all), i.e. where that goal starts.
- **`bridges`** — every concept that is a **transitive prerequisite of topics in two or more selected
  goals**, with the `goals` (branch slugs) it serves and an `unlocks` count. A shared concept is placed
  *between* the goals it connects in the UI.

This is computed from the concept DAG with a forward closure per concept, so a bridge can be indirect:
*Vectors* is reported as serving Calculus as well as Linear Algebra, because `ca-applications` →
`la-vectors`.

## Moderation — requires `moderator` or `admin`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/moderation/queue` | Pending resources and problems plus `counts`. |
| `POST` | `/moderation/:type/:id/approve` | `type` is `resource` or `problem`. Body `{ reason? }`. |
| `POST` | `/moderation/:type/:id/reject` | Same shape; the reason is stored in the log. |
| `GET` | `/moderation/log` | Last 100 moderation actions with moderator names. |

## Admin — requires `admin`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/admin/users` | Members with roadmap and contribution counts. |
| `PATCH` | `/admin/users/:id/role` | Body `{ role }`. You cannot demote your own account. |
| `GET` | `/admin/content` | Query `status` (default `pending`) → resources and problems in that state. |
| `DELETE` | `/admin/:type/:id` | Permanently delete a resource or problem. |

## Stats

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/stats` | Community totals plus the six most upvoted resources. |

---

### Example

```bash
# log in
TOKEN=$(curl -s -X POST localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"priya@mathmap.dev","password":"mathmap123"}' | jq -r .token)

# generate and save a roadmap
curl -s -X POST localhost:4000/api/roadmaps \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"branchIds":[1],"level":"beginner","interestTags":["matrices"],"length":"short"}'
```
