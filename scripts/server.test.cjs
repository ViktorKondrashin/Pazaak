const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { GameServer } = require('../server/game-server.cjs');
const { createApplication } = require('../server/index.cjs');
const { commandFor } = require('../dist/server/core/game-engine.js');
const { initialCollection, rewardFor } = require('../dist/server/core/catalog.js');
const errorCode = (code) => (error) => error.code === code;
const starterIds = initialCollection()
  .slice(0, 10)
  .map((card) => card.instanceId);

function fixture(t, options = {}) {
  let now = 1000;
  const game = new GameServer({ clock: () => now, ...options });
  t.after(() => game.close());
  const create = () => {
    const session = game.createSession();
    return { token: session.token, uid: game.authenticate(session.token) };
  };
  const call = (who, operation, body = {}) => game.request(who.uid, operation, body);
  function pair(a, b, ready = true, withFallback = true) {
    call(a, 'lobby/connect');
    const second = call(b, 'lobby/connect');
    const invited = call(a, 'lobby/invite', { publicId: second.session.publicId });
    const invitationId = invited.session.invitationId;
    const accepted = call(b, 'lobby/respond', { invitationId, response: 'accept' });
    const roomId = accepted.room.id;
    if (withFallback)
      for (const who of [a, b]) call(who, 'room/fallback', { roomId, ids: starterIds });
    if (ready) for (const who of [a, b]) call(who, 'room/ready', { roomId, ids: starterIds });
    return roomId;
  }
  return {
    game,
    create,
    call,
    pair,
    advance: (ms) => {
      now += ms;
      game.maintain();
    },
  };
}

test('two pairs play independently; neither hidden hands nor future cards leave the server', (t) => {
  const { game, create, pair } = fixture(t);
  const [a, b, c, d] = Array.from({ length: 4 }, create);
  const first = pair(a, b),
    second = pair(c, d);
  assert.notEqual(first, second);
  const view = game.snapshot(a.uid);
  assert.equal(view.room.id, first);
  assert.deepEqual(view.room.match.players.find((p) => p.uid === b.uid).hand, []);
  assert.equal(view.room.match.players.find((p) => p.uid === a.uid).hand.length, 4);
  assert.equal(view.room.match.players.find((p) => p.uid === b.uid).handCount, 4);
  for (const key of ['mainDeck', 'rngState', 'processed'])
    assert.equal(key in view.room.match, false);
  for (const player of view.room.match.players) assert.equal('sideDeck' in player, false);
  assert.equal('rngState' in view.room, false);
  for (const key of ['collections', 'fallbackDecks', 'decks'])
    assert.equal(key in view.room, false);
  assert.equal(JSON.stringify(view).includes(c.uid), false);
  assert.equal(JSON.stringify(view).includes(a.token), false);
  assert.equal(JSON.stringify(view).includes('tokenHash'), false);
});
test('the server authenticates room membership and author; knowing public ID grants no access', (t) => {
  const { game, create, call, pair } = fixture(t);
  const a = create(),
    b = create(),
    outsider = create(),
    id = pair(a, b);
  const match = game.store.state.rooms[id].match;
  const actor = match.currentPlayer === a.uid ? a : b;
  const command = commandFor(match, actor.uid, { type: 'stop' });
  assert.throws(() => call(outsider, 'room/command', { roomId: id, command }), errorCode('ROOM'));
  assert.throws(
    () =>
      call(actor, 'room/command', { roomId: id, command: { ...command, author: outsider.uid } }),
    errorCode('MEMBER'),
  );
  assert.throws(() => game.authenticate(game.snapshot(a.uid).session.publicId), errorCode('AUTH'));
});
test('one actionId cannot draw twice; stale and cross-room commands are rejected', (t) => {
  const { game, create, call, pair } = fixture(t);
  const a = create(),
    b = create(),
    id = pair(a, b);
  const match = game.store.state.rooms[id].match;
  const actor = match.currentPlayer === a.uid ? a : b;
  const command = commandFor(match, actor.uid, { type: 'pass' });
  call(actor, 'room/command', { roomId: id, command });
  const state = structuredClone(game.store.state.rooms[id].match);
  call(actor, 'room/command', { roomId: id, command });
  assert.deepEqual(game.store.state.rooms[id].match, state);
  assert.throws(
    () => call(actor, 'room/command', { roomId: id, command: { ...command, actionId: 'new-id' } }),
    errorCode('VERSION'),
  );
  assert.throws(() => call(actor, 'room/command', { roomId: 'other', command }), errorCode('ROOM'));
});
test('competing invitations reserve participants atomically', (t) => {
  const { create, call } = fixture(t);
  const a = create(),
    b = create(),
    c = create();
  for (const who of [a, b, c]) call(who, 'lobby/connect');
  const id = call(b, 'state').session.publicId;
  call(a, 'lobby/invite', { publicId: id });
  assert.throws(() => call(c, 'lobby/invite', { publicId: id }), errorCode('BUSY'));
});
test('the preparation deadline is enforced by the server without client timers', (t) => {
  const { game, create, pair, advance } = fixture(t);
  const a = create(),
    b = create(),
    id = pair(a, b, false);
  assert.equal(game.store.state.rooms[id].phase, 'preparing');
  // Keep both sessions alive while moving the fake clock past the deck deadline.
  game.store.state.profiles[a.uid].lastSeen += 61_000;
  game.store.state.profiles[b.uid].lastSeen += 61_000;
  advance(61_000);
  const room = game.store.state.rooms[id];
  assert.equal(room.phase, 'active');
  assert.ok(room.members.every((uid) => room.ready[uid] && room.decks[uid].length === 10));
  assert.deepEqual(room.decks[a.uid], room.fallbackDecks[a.uid]);
  assert.deepEqual(room.decks[b.uid], room.fallbackDecks[b.uid]);
});
test('disconnect interrupts a game without a winner; voluntary exit awards the opponent', (t) => {
  const { game, create, call, pair } = fixture(t);
  const a = create(),
    b = create(),
    id = pair(a, b);
  call(a, 'session/close');
  assert.equal(game.store.state.rooms[id].match.phase, 'interrupted');
  assert.equal(game.store.state.rooms[id].match.winner, null);
  const c = create(),
    d = create(),
    second = pair(c, d);
  const match = game.store.state.rooms[second].match;
  call(c, 'room/command', { roomId: second, command: commandFor(match, c.uid, { type: 'exit' }) });
  assert.equal(game.store.state.rooms[second].match.phase, 'finished');
  assert.equal(game.store.state.rooms[second].match.winner, d.uid);
  assert.equal(game.store.state.rooms[second].match.finishReason, 'exit');
});
test('heartbeat timeout closes a room and a delayed closed session cannot rejoin', (t) => {
  const { game, create, call, pair, advance } = fixture(t);
  const a = create(),
    b = create(),
    id = pair(a, b);
  game.store.state.profiles[b.uid].lastSeen += 46_000;
  advance(46_000);
  assert.equal(game.store.state.rooms[id].match.phase, 'interrupted');
  assert.throws(() => game.authenticate(a.token), errorCode('AUTH'));
  assert.equal(call(b, 'state').room.match.winner, null);
});
test('online decks use catalog IDs without uploading campaign progress or the collection', (t) => {
  const { game, create, call, pair, advance } = fixture(t);
  const a = create(),
    b = create(),
    roomId = pair(a, b, false, false);
  const reward = rewardFor(1)[0];
  const unlockedDeck = [...starterIds.slice(1), reward.instanceId];
  const first = call(a, 'room/fallback', { roomId, ids: unlockedDeck });
  assert.equal(first.room.t0, null);
  assert.equal(first.room.fallbackSubmitted, true);
  assert.equal(game.snapshot(b.uid).room.fallbackSubmitted, false);
  assert.throws(() => call(a, 'room/ready', { roomId, ids: starterIds }), errorCode('PHASE'));
  advance(500);
  assert.throws(
    () => call(b, 'room/fallback', { roomId, ids: [...starterIds.slice(1), 'invented'] }),
    errorCode('DECK_CARD'),
  );
  assert.throws(
    () => call(b, 'room/fallback', { roomId, ids: Array(10).fill(starterIds[0]) }),
    errorCode('DECK_SIZE'),
  );
  const second = call(b, 'room/fallback', { roomId, ids: starterIds });
  assert.equal(second.room.t0, second.serverTime);
  const retry = call(a, 'room/fallback', { roomId, ids: starterIds });
  assert.equal(retry.room.t0, second.room.t0);
  assert.deepEqual(game.store.state.rooms[roomId].fallbackDecks[a.uid].at(-1), reward);
  call(a, 'room/ready', { roomId, ids: unlockedDeck });
  call(b, 'room/ready', { roomId, ids: starterIds });
  const { match } = game.store.state.rooms[roomId];
  assert.deepEqual(match.players.find((p) => p.uid === a.uid).sideDeck.at(-1), reward);
  assert.equal('campaign' in game.store.state.profiles[a.uid], false);
  assert.throws(() => call(a, 'campaign/prepare', { planetId: 1 }), errorCode('NOT_FOUND'));
});
test('server cleanup retains a disconnected opponent result until the viewer acknowledges it', (t) => {
  const { game, create, call, pair, advance } = fixture(t);
  const a = create(),
    b = create(),
    id = pair(a, b);
  call(a, 'session/close');
  game.store.state.profiles[b.uid].lastSeen += 301_000;
  advance(301_000);
  assert.ok(game.snapshot(b.uid).room);
  assert.equal(game.store.state.profiles[a.uid], undefined);
  call(b, 'room/finish', { roomId: id });
  assert.equal(game.snapshot(b.uid).room, null);
  assert.equal(game.snapshot(b.uid).session.status, 'idle');
});
test('SQLite stores server state but restarting never restores anonymous sessions', () => {
  const folder = mkdtempSync(path.join(os.tmpdir(), 'pazaak-vps-test-'));
  const filename = path.join(folder, 'game.sqlite');
  let game;
  try {
    game = new GameServer({ database: filename });
    const session = game.createSession();
    assert.ok(
      game.store.db
        .prepare('SELECT state_json FROM runtime WHERE id=1')
        .get()
        .state_json.includes('tokenHash'),
    );
    game.close();
    game = new GameServer({ database: filename });
    assert.throws(() => game.authenticate(session.token), errorCode('AUTH'));
  } finally {
    game?.close();
    assert.ok(path.resolve(folder).startsWith(path.resolve(os.tmpdir()) + path.sep));
    rmSync(folder, { recursive: true, force: true });
  }
});
test('HTTP API uses bearer headers, ignores cookies, rejects malformed JSON and cross-origin calls', async (t) => {
  const { server } = createApplication();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  const base = `http://127.0.0.1:${server.address().port}`;
  const session = await fetch(base + '/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: 'pazaak-campaign=old' },
    body: '{}',
  });
  assert.equal(session.status, 201);
  assert.equal(session.headers.get('set-cookie'), null);
  const data = await session.json();
  assert.equal('campaign' in data, false);
  assert.equal('campaignMatch' in data, false);
  const denied = await fetch(base + '/api/state', { headers: { Cookie: `token=${data.token}` } });
  assert.equal(denied.status, 401);
  const state = await fetch(base + '/api/state', {
    headers: { Authorization: `Bearer ${data.token}` },
  });
  assert.equal(state.status, 200);
  assert.equal(state.headers.get('cache-control'), 'no-store');
  const foreign = await fetch(base + '/api/lobby/connect', {
    method: 'POST',
    headers: {
      Origin: 'https://foreign.example',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.token}`,
    },
    body: '{}',
  });
  assert.equal(foreign.status, 403);
  const invalid = await fetch(base + '/api/lobby/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` },
    body: '{',
  });
  assert.equal(invalid.status, 400);
});
