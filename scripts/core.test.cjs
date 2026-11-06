const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
// Compile the actual TypeScript modules for Node's built-in test runner.
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      experimentalDecorators: true,
    },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
const { createMatch, applyCommand, commandFor } = require('../src/app/core/game-engine.ts');
const { botView, chooseBotAction } = require('../src/app/core/bot.ts');
const { applyRoomCommand, hydrateRoom } = require('../src/app/core/room.ts');
const { cardFromType, compareCards } = require('../src/app/core/catalog.ts');
const card = (id, value, kind = 'positive') => ({ instanceId: id, typeId: id, kind, value });

function fixture(mode = 'campaign', own = [10, 4], other = [10, 7], stopped = false) {
  const deck = Array.from({ length: 10 }, (_, i) => card('side-' + i, (i % 6) + 1));
  const state = createMatch({
    matchId: 'test-match',
    mode,
    planetId: 1,
    uids: ['a', 'b'],
    decks: [deck, deck],
    seed: 14,
  });
  state.currentPlayer = 'a';
  state.mainDeck = [
    card('draw-0', 3, 'main'),
    card('draw-1', 2, 'main'),
    card('draw-2', 1, 'main'),
  ];
  state.deckIndex = 0;
  state.players.forEach((p, i) => {
    p.board = [own, other][i].map((n, j) => ({
      ...card(p.uid + '-board-' + j, Math.abs(n), 'main'),
      signedValue: n,
    }));
    p.score = p.board.reduce((s, c) => s + c.signedValue, 0);
    p.hand = [
      card(p.uid + '-four', 4),
      card(p.uid + '-one', 1),
      card(p.uid + '-minus', 4, 'negative'),
      card(p.uid + '-dual', 3, 'dual'),
    ];
    p.stopped = i === 1 && stopped;
  });
  return state;
}

const act = (state, payload, uid = state.currentPlayer) =>
  applyCommand(state, commandFor(state, uid, payload), uid).state;
const playFour = { type: 'play', instanceId: 'a-four' };
const ruleError = (code) => (e) => e.code === code;

test('campaign preparation, bot turns and rewards run without HTTP and reset in a new campaign', (t) => {
  require('@angular/compiler');
  const { GameService } = require('../src/app/game.service.ts');
  const { CampaignService } = require('../src/app/campaign.service.ts');
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const http = t.mock.method(globalThis, 'fetch', () => {
    throw new Error('The solo game must not make HTTP requests');
  });
  const campaign = new CampaignService();
  const game = new GameService(campaign);
  assert.equal(game.prepare(2), false);
  assert.equal(game.prepare(1), true);
  assert.equal(game.start([]), false);
  t.mock.timers.tick(60_000);
  assert.equal(game.preparing(), null);
  assert.equal(game.match().mode, 'campaign');
  const match = game.current();
  assert.equal(match.players[0].sideDeck.length, 10);
  if (match.currentPlayer === game.humanUid) assert.equal(game.act({ type: 'stop' }), true);
  const version = game.match().version;
  t.mock.timers.tick(650);
  assert.ok(game.match().version > version);

  const decisiveSet = fixture('campaign', [10, 9], [10, 8], true);
  decisiveSet.players[0].uid = game.humanUid;
  decisiveSet.players[1].uid = 'bot';
  decisiveSet.currentPlayer = game.humanUid;
  decisiveSet.players[0].wins = 2;
  game.current.set(decisiveSet);
  assert.equal(game.act({ type: 'stop' }), true);
  assert.deepEqual(campaign.state().completed, [1]);
  assert.equal(campaign.state().collection.length, 19);
  assert.equal(campaign.selectedPlanet(), 2);
  campaign.recordResult(game.current(), game.humanUid);
  assert.equal(campaign.state().collection.length, 19);
  game.clear();
  assert.equal(campaign.state().collection.length, 19);
  assert.equal(new CampaignService().state().collection.length, 14);
  assert.equal(http.mock.callCount(), 0);
});

test('display sorting groups rewards by kind and nominal without mutating the deck', () => {
  const types = ['3&6', '-6', '+6', '±1', '2&4', '+1', '-1', '±6'];
  const deck = types.map((type, i) => cardFromType(type, 'sort-' + i));
  const before = structuredClone(deck);
  assert.deepEqual(
    [...deck].sort(compareCards).map((card) => card.typeId),
    ['+1', '+6', '-1', '-6', '±1', '±6', '2&4', '3&6'],
  );
  assert.deepEqual(deck, before);
});

for (const mode of ['campaign', 'pvp']) {
  test(mode + ': confirming 20 stops without another own draw and opponent continues', () => {
    const start = fixture(mode, [10, 10], [10]);
    const next = act(start, { type: 'pass' });
    assert.equal(next.players[0].stopped, true);
    assert.equal(next.players[0].score, 20);
    assert.equal(next.players[0].board.length, 2);
    assert.equal(next.players[1].board.length, 2);
    assert.equal(next.phase, 'playing');
    assert.equal(next.currentPlayer, 'b');
  });
  test(mode + ': playing +4 keeps the same turn and does not draw', () => {
    const start = fixture(mode),
      original = structuredClone(start);
    const next = act(start, playFour);
    assert.equal(next.players[0].score, 18);
    assert.equal(next.players[0].hand.length, 3);
    assert.equal(next.players[0].board.length, 3);
    assert.deepEqual(next.players[1], start.players[1]);
    assert.equal(next.currentPlayer, 'a');
    assert.equal(next.turnId, start.turnId);
    assert.equal(next.deckIndex, start.deckIndex);
    assert.equal(next.rngState, start.rngState);
    assert.equal(next.handCardPlayed, true);
    assert.equal(next.version, start.version + 1);
    assert.deepEqual(start, original);
  });
  test(mode + ': play +4, then Stop, keeps 18 without an extra card', () => {
    const start = fixture(mode, [10, 4], [10, 7], true);
    const played = act(start, playFour);
    assert.equal(played.phase, 'playing');
    const stopped = act(played, { type: 'stop' });
    assert.equal(stopped.phase, 'setResult');
    assert.equal(stopped.players[0].score, 18);
    assert.equal(stopped.players[0].stopped, true);
    assert.equal(stopped.deckIndex, start.deckIndex);
    assert.equal(stopped.result.winner, 'a');
  });
  test(mode + ': End turn draws exactly once for the next player', () => {
    const played = act(fixture(mode), playFour);
    const next = act(played, { type: 'pass' });
    assert.equal(next.currentPlayer, 'b');
    assert.equal(next.turnId, played.turnId + 1);
    assert.equal(next.deckIndex, 1);
    assert.equal(next.players[0].score, 18);
    assert.equal(next.players[1].score, 20);
    assert.equal(next.handCardPlayed, false);
  });
  test(mode + ': a stopped opponent does not cause a draw until End turn', () => {
    const start = fixture(mode, [10], [10, 7], true);
    const played = act(start, playFour);
    assert.equal(played.players[0].score, 14);
    assert.equal(played.deckIndex, 0);
    const next = act(played, { type: 'pass' });
    assert.equal(next.currentPlayer, 'a');
    assert.equal(next.turnId, start.turnId + 1);
    assert.equal(next.players[0].score, 17);
    assert.equal(next.deckIndex, 1);
    assert.equal(next.handCardPlayed, false);
    assert.doesNotThrow(() => act(next, { type: 'play', instanceId: 'a-one' }));
  });
}

test('a second hand card is rejected even with a fresh version', () => {
  const played = act(fixture(), playFour),
    before = structuredClone(played);
  assert.throws(
    () => act(played, { type: 'play', instanceId: 'a-one' }),
    ruleError('HAND_CARD_PLAYED'),
  );
  assert.deepEqual(played, before);
});
test('the opponent cannot act between play and End turn', () => {
  const played = act(fixture(), playFour);
  assert.throws(() => act(played, { type: 'stop' }, 'b'), ruleError('TURN'));
});
test('duplicate play is idempotent and stale same-turn commands are rejected', () => {
  const start = fixture(),
    command = commandFor(start, 'a', playFour, 'play-once');
  const played = applyCommand(start, command, 'a').state;
  const repeat = applyCommand(played, command, 'a');
  assert.equal(repeat.duplicate, true);
  assert.equal(repeat.state, played);
  assert.throws(
    () => applyCommand(played, commandFor(start, 'a', { type: 'stop' }, 'old-stop'), 'a'),
    ruleError('VERSION'),
  );
});
test('20 after a card waits for confirmation and End turn stops without another draw', () => {
  const played = act(fixture('campaign', [10, 6], [10, 7], true), playFour);
  assert.equal(played.players[0].score, 20);
  assert.equal(played.players[0].stopped, false);
  assert.equal(played.phase, 'playing');
  const done = act(played, { type: 'pass' });
  assert.equal(done.phase, 'setResult');
  assert.equal(done.deckIndex, 0);
  assert.equal(done.result.winner, 'a');
});
test('a bust after drawing can be corrected once before Stop', () => {
  const played = act(fixture('campaign', [10, 10, 2]), { type: 'play', instanceId: 'a-minus' });
  assert.equal(played.players[0].score, 18);
  assert.equal(played.currentPlayer, 'a');
  const stopped = act(played, { type: 'stop' });
  assert.equal(stopped.players[0].score, 18);
  assert.equal(stopped.players[0].stopped, true);
});
test('a bust caused by a hand card is confirmed explicitly', () => {
  const played = act(fixture('campaign', [10, 9], [10, 7], true), playFour);
  assert.equal(played.players[0].stopped, false);
  assert.equal(played.deckIndex, 0);
  const done = act(played, { type: 'pass' });
  assert.equal(done.phase, 'setResult');
  assert.equal(done.result.winner, 'b');
  assert.equal(done.deckIndex, 0);
});
test('dual and flip cards use the same one-card limit and do not end the turn', () => {
  const dual = act(fixture(), { type: 'play', instanceId: 'a-dual', sign: -1 });
  assert.equal(dual.players[0].score, 11);
  assert.equal(dual.currentPlayer, 'a');
  const start = fixture('campaign', [2, 4, 3]);
  start.players[0].hand.push(card('flip', 0, 'flip24'));
  const flipped = act(start, { type: 'play', instanceId: 'flip' });
  assert.equal(flipped.players[0].score, -3);
  assert.equal(flipped.handCardPlayed, true);
  assert.equal(flipped.deckIndex, 0);
});
test('a ninth hand card still completes the set immediately', () => {
  const played = act(fixture('campaign', Array(8).fill(2), [10, 7]), playFour);
  assert.equal(played.phase, 'setResult');
  assert.equal(played.result.reason, 'nineCards');
  assert.equal(played.result.winner, 'a');
  assert.equal(played.deckIndex, 0);
});
test('a ninth automatic draw still completes the set before hand actions', () => {
  const start = fixture('campaign', [10], Array(8).fill(2));
  const next = act(start, { type: 'pass' });
  assert.equal(next.phase, 'setResult');
  assert.equal(next.result.reason, 'nineCards');
  assert.equal(next.players[1].score, 19);
});
test('empty deck: play clears old passes, subsequent passes finish the set', () => {
  const start = fixture();
  start.mainDeck = [];
  start.passed = ['b'];
  const played = act(start, playFour);
  assert.deepEqual(played.passed, []);
  assert.equal(played.phase, 'playing');
  const passed = act(played, { type: 'pass' });
  assert.deepEqual(passed.passed, ['a']);
  assert.equal(passed.phase, 'playing');
  const done = act(passed, { type: 'pass' });
  assert.equal(done.result.reason, 'emptyDeck');
});
test('new set resets the hand-card flag after both confirmations', () => {
  let state = fixture('campaign', [10, 4], [10, 7], true);
  state = act(act(state, playFour), { type: 'stop' });
  const turn = state.turnId;
  state = act(state, { type: 'ack' }, 'a');
  state = act(state, { type: 'ack' }, 'b');
  assert.equal(state.phase, 'playing');
  assert.equal(state.handCardPlayed, false);
  assert.equal(state.turnId, turn + 1);
  assert.equal(state.setNumber, 2);
});
test('third set victory after play then Stop ends the match without extra draw', () => {
  const start = fixture('campaign', [10, 4], [10, 7], true);
  start.players[0].wins = 2;
  const done = act(act(start, playFour), { type: 'stop' });
  assert.equal(done.phase, 'finished');
  assert.equal(done.winner, 'a');
  assert.equal(done.players[0].wins, 3);
  assert.equal(done.deckIndex, 0);
});
test('room commands preserve the flag across JSON serialization and reject replayed second cards', () => {
  let room = {
    id: 'test-match',
    invitationId: 'invite',
    members: ['a', 'b'],
    sessions: { a: 'sa', b: 'sb' },
    phase: 'active',
    closedReason: null,
    fallbackDecks: {},
    decks: {},
    ready: {},
    t0: 0,
    rngState: 14,
    match: fixture('pvp', [10, 4], [10, 7], true),
    confirmations: {},
    version: 0,
  };
  room = applyRoomCommand(room, 'a', commandFor(room.match, 'a', playFour));
  room = hydrateRoom(JSON.parse(JSON.stringify(room)));
  assert.equal(room.match.handCardPlayed, true);
  assert.throws(
    () =>
      applyRoomCommand(
        room,
        'a',
        commandFor(room.match, 'a', { type: 'play', instanceId: 'a-one' }),
      ),
    ruleError('HAND_CARD_PLAYED'),
  );
  room = applyRoomCommand(room, 'a', commandFor(room.match, 'a', { type: 'stop' }));
  assert.equal(room.match.players[0].score, 18);
  assert.equal(room.match.deckIndex, 0);
  assert.equal(room.match.result.winner, 'a');
  delete room.match.handCardPlayed;
  assert.equal(hydrateRoom(room).match.handCardPlayed, false);
});
test('bot plays a winning card then stops on its next action', () => {
  let state = fixture('campaign', [10, 4], [10, 7], true);
  assert.deepEqual(chooseBotAction(botView(state, 'a')), playFour);
  state = act(state, chooseBotAction(botView(state, 'a')));
  assert.deepEqual(chooseBotAction(botView(state, 'a')), { type: 'stop' });
  state = act(state, chooseBotAction(botView(state, 'a')));
  assert.equal(state.result.winner, 'a');
});
test('bot may improve below a stopped opponent, then pass instead of playing twice', () => {
  let state = fixture('campaign', [10], [10, 9], true);
  assert.deepEqual(chooseBotAction(botView(state, 'a')), playFour);
  state = act(state, playFour);
  assert.deepEqual(chooseBotAction(botView(state, 'a')), { type: 'pass' });
});
test('bot matches finish with legal actions under the two-step turn model', () => {
  const deck = Array.from({ length: 10 }, (_, i) => card('side-' + i, (i % 6) + 1));
  for (let seed = 1; seed <= 100; seed++) {
    let state = createMatch({
      matchId: 'simulation-' + seed,
      mode: 'pvp',
      uids: ['a', 'b'],
      decks: [deck, deck],
      seed,
    });
    let commands = 0;
    while (state.phase !== 'finished' && commands++ < 1000) {
      if (state.phase === 'setResult') {
        state = act(state, { type: 'ack' }, 'a');
        state = act(state, { type: 'ack' }, 'b');
      } else {
        const action = chooseBotAction(botView(state, state.currentPlayer));
        if (state.handCardPlayed) assert.notEqual(action.type, 'play');
        state = act(state, action);
      }
      for (const p of state.players) {
        assert.equal(
          p.score,
          p.board.reduce((sum, c) => sum + c.signedValue, 0),
        );
        assert.ok(p.board.length <= 9);
      }
    }
    assert.equal(state.phase, 'finished', 'seed ' + seed);
  }
});
