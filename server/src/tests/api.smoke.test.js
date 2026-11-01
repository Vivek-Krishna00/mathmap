import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { closePool } from '../db/pool.js';

let server;
let base;
let dbUp = false;

test.before(async () => {
  const app = createApp();
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  try {
    const res = await fetch(`${base}/api/health`);
    const body = await res.json();
    dbUp = body.db === 'up';
  } catch {
    dbUp = false;
  }
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await closePool();
});

const skipIfNoDb = (t) => {
  if (!dbUp) {
    t.skip('database not available - run npm run db:setup first');
    return true;
  }
  return false;
};

test('health endpoint reports ok', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'ok');
});

test('lists the six branches', async (t) => {
  if (skipIfNoDb(t)) return;
  const res = await fetch(`${base}/api/branches`);
  assert.equal(res.status, 200);
  const { branches } = await res.json();
  assert.equal(branches.length, 6);
});

test('topic list and detail respond', async (t) => {
  if (skipIfNoDb(t)) return;
  const list = await (await fetch(`${base}/api/topics?limit=5`)).json();
  assert.ok(list.topics.length > 0);
  const detail = await (await fetch(`${base}/api/topics/${list.topics[0].slug}`)).json();
  assert.equal(detail.topic.slug, list.topics[0].slug);
  assert.ok(Array.isArray(detail.topic.resources));
});

test('community graph returns nodes and edges', async (t) => {
  if (skipIfNoDb(t)) return;
  const graph = await (await fetch(`${base}/api/graph`)).json();
  assert.ok(graph.nodes.length >= 60);
  assert.ok(Array.isArray(graph.edges));
});

test('roadmap preview generates an ordered roadmap', async (t) => {
  if (skipIfNoDb(t)) return;
  const { branches } = await (await fetch(`${base}/api/branches`)).json();
  const la = branches.find((b) => b.slug === 'linear-algebra');
  const res = await fetch(`${base}/api/roadmaps/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ branchIds: [la.id], level: 'beginner', interestTags: ['matrices'], length: 'short' }),
  });
  assert.equal(res.status, 200);
  const { roadmap } = await res.json();
  assert.ok(roadmap.items.length > 0);
  assert.equal(roadmap.items[0].order, 1);
});

test('roadmap routes require authentication', async (t) => {
  if (skipIfNoDb(t)) return;
  const res = await fetch(`${base}/api/roadmaps`);
  assert.equal(res.status, 401);
});

test('registration, login and /me round-trip', async (t) => {
  if (skipIfNoDb(t)) return;
  const email = `test-${Date.now()}@mathmap.dev`;
  const reg = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email, password: 'secret123' }),
  });
  assert.equal(reg.status, 201);
  const { token, user } = await reg.json();
  assert.ok(token);
  assert.equal(user.role, 'learner');

  const me = await fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).user.email, email);

  const bad = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'wrongpassword' }),
  });
  assert.equal(bad.status, 401);
});

test('moderation queue enforces roles', async (t) => {
  if (skipIfNoDb(t)) return;

  const anon = await fetch(`${base}/api/moderation/queue`);
  assert.equal(anon.status, 401);

  const login = async (email) => {
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'mathmap123' }),
    });
    return (await res.json()).token;
  };

  const learnerToken = await login('priya@mathmap.dev');
  const forbidden = await fetch(`${base}/api/moderation/queue`, {
    headers: { Authorization: `Bearer ${learnerToken}` },
  });
  assert.equal(forbidden.status, 403);

  const modToken = await login('moderator@mathmap.dev');
  const ok = await fetch(`${base}/api/moderation/queue`, {
    headers: { Authorization: `Bearer ${modToken}` },
  });
  assert.equal(ok.status, 200);
  assert.ok((await ok.json()).counts.total >= 1);
});
