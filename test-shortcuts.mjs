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

function run(code, state, body = '', options = {}) {
  const result = { aborted: false, toasts: [], enqueued: [], enqueuedVariables: [], opened: [] };
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
    enqueueShortcut: (id, variables) => {
      result.enqueued.push(id);
      result.enqueuedVariables.push(variables);
    },
    openUrl: (url) => {
      result.opened.push(url);
      if (options.openFails) throw new Error('No matching app');
    },
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
  assert.equal(feed.enqueuedVariables[0].mcd_commit, commit);
  assert.equal(state.mcd_commit, commit);
  assert.equal(run(data.codeOnPrepare, state).aborted, false);
  const payment = run(data.codeOnSuccess, state, validOrder);
  assert.equal(payment.opened.length, 1);
  const opened = new URL(payment.opened[0]);
  assert.equal(opened.protocol, 'mcdapp:');
  assert.equal(opened.hostname, 'page');
  assert.equal(opened.searchParams.get('androidPageName'), 'ComponentOrder');
  assert.equal(opened.searchParams.get('androidPageAction'), 'order_detail');
  assert.deepEqual(JSON.parse(opened.searchParams.get('parameters')), {
    orderId: '1030900790000661788656499983', openCashierDesk: '1',
  });
  assert.equal(state.mcd_commit, '');
}

// App launch failure is reported without silently opening a browser.
{
  const state = { mcd_commit: commit };
  const result = run(data.codeOnSuccess, state, validOrder, { openFails: true });
  assert.equal(result.aborted, true);
  assert.equal(result.opened.length, 1);
  assert.match(result.opened[0], /^mcdapp:\/\//);
  assert.deepEqual(result.toasts, ['无法打开麦当劳 App，请确认已安装']);
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
