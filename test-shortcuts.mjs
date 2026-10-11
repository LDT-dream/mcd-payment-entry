import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const config = JSON.parse(await readFile(new URL('./shortcuts.json', import.meta.url), 'utf8'));
const visible = config.categories[0].shortcuts.find((shortcut) => shortcut.id === 'f3b4d91a-7b7a-4f3e-8d8c-2b9f0e6a4c12');
const data = config.categories[0].shortcuts.find((shortcut) => shortcut.id === 'b3e9d7c8-5a13-4a9e-95db-9f4f0e0ba6c1');
const abortSignal = Symbol('abort');

assert.equal(visible.codeOnSuccess, (await readFile(new URL('./shortcut-success.js', import.meta.url), 'utf8')).trimEnd());
assert.equal(data.codeOnSuccess, (await readFile(new URL('./shortcut-data-success.js', import.meta.url), 'utf8')).trimEnd());
assert.equal(visible.codeOnFailure, (await readFile(new URL('./shortcut-failure.js', import.meta.url), 'utf8')).trimEnd());
assert.equal(data.codeOnFailure, visible.codeOnFailure);

function run(code, state, body = '') {
  const result = { aborted: false, toasts: [], enqueued: [], opened: [] };
  const context = {
    response: { body },
    JSON,
    Date,
    Number,
    String,
    Math,
    RegExp,
    encodeURIComponent,
    getVariable: (key) => state[key],
    setVariable: (key, value) => { state[key] = value; },
    showToast: (message) => result.toasts.push(message),
    enqueueShortcut: (id) => result.enqueued.push(id),
    openUrl: (url) => result.opened.push(url),
    abort: () => { throw abortSignal; },
  };
  try {
    vm.runInNewContext(code, context, { timeout: 1000 });
  } catch (error) {
    if (error !== abortSignal) throw error;
    result.aborted = true;
  }
  return result;
}

function atom(commit) {
  return `<feed><entry><id>tag:github.com,2008:Grit::Commit/${commit}</id></entry></feed>`;
}

const commit = '0123456789abcdef0123456789abcdef01234567';
const validOrder = JSON.stringify({
  orderId: '1030900790000661788656499983',
  updatedAt: new Date(Date.now() - 1_000).toISOString(),
  useUntil: new Date(Date.now() + 60_000).toISOString(),
});

// A normal click clears stale state, resolves the current commit, then the hidden request opens the official URL.
{
  const state = { mcd_commit: 'stale', mcd_nonce: '0' };
  run(visible.codeOnPrepare, state);
  assert.equal(state.mcd_commit, '');
  assert.match(state.mcd_nonce, /^\d+-\d+$/);
  const feed = run(visible.codeOnSuccess, state, atom(commit));
  assert.deepEqual(feed.enqueued, [data.id]);
  assert.equal(state.mcd_commit, commit);
  assert.equal(run(data.codeOnPrepare, state).aborted, false);
  const payment = run(data.codeOnSuccess, state, validOrder);
  assert.deepEqual(payment.opened, ['https://m.mcd.cn/mcp/jumpToApp?orderId=1030900790000661788656499983']);
  assert.equal(state.mcd_commit, '');
}

// A malformed Atom feed, no entry, and a hash injection are all rejected without enqueueing a data request.
for (const body of [
  '<feed><entry><id>tag:github.com,2008:Grit::Commit/abc</id></entry></feed>',
  '<feed></feed>',
  atom(`${commit}<script>alert(1)</script>`),
]) {
  const state = { mcd_commit: commit };
  const result = run(visible.codeOnSuccess, state, body);
  assert.equal(result.aborted, true);
  assert.deepEqual(result.enqueued, []);
  assert.equal(state.mcd_commit, '');
}

// The hidden request also rejects a tampered commit before its URL can be resolved.
{
  const state = { mcd_commit: `${commit}/latest.json?evil=1` };
  const result = run(data.codeOnPrepare, state);
  assert.equal(result.aborted, true);
  assert.equal(state.mcd_commit, '');
}

// Expired and missing orders cannot open the official payment URL.
for (const body of [
  JSON.stringify({ orderId: '123', updatedAt: '2026-01-01T00:00:00.000Z', useUntil: '2026-01-01T00:01:00.000Z' }),
  JSON.stringify({ orderId: null, updatedAt: null, useUntil: null }),
]) {
  const state = { mcd_commit: commit };
  const result = run(data.codeOnSuccess, state, body);
  assert.equal(result.aborted, true);
  assert.deepEqual(result.opened, []);
  assert.equal(state.mcd_commit, '');
}

// Both request-failure handlers clear the commit before reporting an error.
for (const shortcut of [visible, data]) {
  const state = { mcd_commit: commit };
  run(shortcut.codeOnFailure, state);
  assert.equal(state.mcd_commit, '');
}

console.log('shortcut two-stage flow tests passed');
