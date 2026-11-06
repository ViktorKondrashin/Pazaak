import {
  Action,
  Card,
  clone,
  Command,
  MatchState,
  PlayerState,
  Receipt,
  requireRule,
  SetResult,
  TurnAction,
} from './models';
import { mainDeck } from './catalog';
import { randomId, randomInt, shuffled } from './random';

export const RULES = {
  target: 20,
  slots: 9,
  sideDeck: 10,
  hand: 4,
  wins: 3,
  preparationMs: 60_000,
} as const;

export interface TurnPosition {
  players: [PlayerState, PlayerState];
  currentPlayer: string;
  passed: string[];
  remaining: number;
  handCardPlayed: boolean;
}

export function compareScores(a: number, b: number): 0 | 1 | null {
  if (a > 20 && b > 20) return null;
  if (a > 20) return 1;
  if (b > 20) return 0;
  return a === b ? null : a > b ? 0 : 1;
}

export function recalculate(player: PlayerState): void {
  player.score = player.board.reduce((sum, c) => sum + c.signedValue, 0);
}

/** Resolves only the visible action, before the next hidden draw. Used by engine and bot. */
export function resolveTurn(
  position: TurnPosition,
  author: string,
  action: TurnAction,
): SetResult['reason'] | null {
  const player = position.players.find((p) => p.uid === author);
  requireRule(
    player && author === position.currentPlayer && !player.stopped,
    'TURN',
    'Сейчас ход соперника',
  );
  requireRule(player.board.length < RULES.slots, 'BOARD_FULL', 'Поле уже заполнено');
  if (action.type === 'play') {
    requireRule(
      !position.handCardPlayed,
      'HAND_CARD_PLAYED',
      'В этом ходу карта руки уже сыграна. Завершите ход или нажмите «Стоп»',
    );
    const index = player.hand.findIndex((c) => c.instanceId === action.instanceId);
    requireRule(index !== -1, 'HAND_CARD', 'Карты уже нет в руке');
    const card = player.hand[index];
    if (card.kind === 'dual')
      requireRule(action.sign === 1 || action.sign === -1, 'SIGN', 'Выберите знак карты');
    else requireRule(action.sign === undefined, 'SIGN', 'У этой карты фиксированный эффект');
    let signedValue =
      card.kind === 'negative'
        ? -card.value
        : card.kind === 'dual'
          ? card.value * action.sign!
          : card.value;
    if (card.kind === 'flip24' || card.kind === 'flip36') {
      const values = card.kind === 'flip24' ? [2, 4] : [3, 6];
      for (const placed of player.board)
        if (values.includes(Math.abs(placed.signedValue))) placed.signedValue *= -1;
      signedValue = 0;
    }
    player.hand.splice(index, 1);
    player.board.push({ ...card, signedValue });
    recalculate(player);
    position.passed = [];
    position.handCardPlayed = true;
    // Playing a hand card never draws or passes the turn. The player chooses next.
    return player.board.length === RULES.slots ? 'nineCards' : null;
  } else if (action.type === 'stop') {
    player.stopped = true;
    position.passed = [];
  } else {
    requireRule(action.type === 'pass', 'ACTION', 'Неизвестное действие');
    if (position.remaining === 0 && !position.passed.includes(author)) position.passed.push(author);
  }
  if (player.score >= RULES.target && !player.stopped) {
    player.stopped = true;
    position.passed = [];
  }
  const active = position.players.filter((p) => !p.stopped);
  if (active.length === 0) return 'stopped';
  if (position.remaining === 0 && active.every((p) => position.passed.includes(p.uid)))
    return 'emptyDeck';
  return null;
}

function finishSet(state: MatchState, reason: SetResult['reason']): void {
  const winnerIndex = compareScores(state.players[0].score, state.players[1].score);
  const winner = winnerIndex === null ? null : state.players[winnerIndex];
  if (winner) winner.wins++;
  state.result = {
    setNumber: state.setNumber,
    winner: winner?.uid ?? null,
    scores: [state.players[0].score, state.players[1].score],
    reason,
  };
  state.acknowledgements = [];
  state.phase = winner && winner.wins >= RULES.wins ? 'finished' : 'setResult';
  if (state.phase === 'finished') {
    state.winner = winner!.uid;
    state.finishReason = 'sets';
  }
}

function beginTurn(state: MatchState): void {
  state.turnId++;
  state.handCardPlayed = false;
  const player = state.players.find((p) => p.uid === state.currentPlayer)!;
  if (state.deckIndex < state.mainDeck.length) {
    const card = state.mainDeck[state.deckIndex++];
    player.board.push({ ...card, signedValue: card.value });
    state.passed = [];
    recalculate(player);
    if (player.board.length === RULES.slots) finishSet(state, 'nineCards');
  }
}

function beginSet(state: MatchState): void {
  state.setNumber++;
  state.phase = 'playing';
  state.result = null;
  state.passed = [];
  state.acknowledgements = [];
  for (const player of state.players) {
    player.board = [];
    player.score = 0;
    player.stopped = false;
    player.hand = shuffled(player.sideDeck, state)
      .slice(0, RULES.hand)
      .map((c) => ({ ...c }));
  }
  state.currentPlayer = state.players[randomInt(state, 2)].uid;
  beginTurn(state);
}

export function createMatch(options: {
  matchId: string;
  mode: 'campaign' | 'pvp';
  planetId?: number;
  uids: [string, string];
  decks: [Card[], Card[]];
  seed: number;
}): MatchState {
  requireRule(
    options.uids[0] !== options.uids[1] && options.uids.every(Boolean),
    'MEMBERS',
    'Нужны два разных участника',
  );
  for (const deck of options.decks)
    requireRule(
      deck.length === RULES.sideDeck &&
        new Set(deck.map((c) => c.instanceId)).size === RULES.sideDeck,
      'DECK_SIZE',
      'Наберите ровно 10 разных экземпляров карт',
    );
  requireRule(
    options.mode !== 'campaign' ||
      (Number.isInteger(options.planetId) && options.planetId! >= 1 && options.planetId! <= 5),
    'PLANET',
    'Неизвестная планета',
  );
  const state: MatchState = {
    matchId: options.matchId,
    mode: options.mode,
    planetId: options.planetId ?? null,
    players: options.uids.map(
      (uid, i): PlayerState => ({
        uid,
        sideDeck: clone(options.decks[i]),
        hand: [],
        board: [],
        score: 0,
        wins: 0,
        stopped: false,
      }),
    ) as [PlayerState, PlayerState],
    phase: 'playing',
    currentPlayer: options.uids[0],
    mainDeck: [],
    deckIndex: 0,
    rngState: options.seed >>> 0,
    setNumber: 0,
    turnId: 0,
    handCardPlayed: false,
    version: 0,
    passed: [],
    acknowledgements: [],
    result: null,
    winner: null,
    finishReason: null,
    processed: {},
  };
  state.mainDeck = shuffled(mainDeck(), state);
  beginSet(state);
  return state;
}

export function commandFor(
  state: Pick<MatchState, 'matchId' | 'version' | 'setNumber' | 'turnId'>,
  author: string,
  payload: Action,
  actionId: string = randomId(),
): Command {
  return {
    roomId: state.matchId,
    author,
    payload,
    actionId,
    expectedVersion: state.version,
    setNumber: state.setNumber,
    turnId: state.turnId,
  };
}

export function applyCommand(
  input: MatchState,
  command: Command,
  authenticatedUid: string,
): { state: MatchState; receipt: Receipt; duplicate: boolean } {
  requireRule(
    input.players.some((p) => p.uid === authenticatedUid) && command.author === authenticatedUid,
    'MEMBER',
    'Вы не участник этого матча',
  );
  requireRule(command.roomId === input.matchId, 'ROOM', 'Команда адресована другому матчу');
  requireRule(
    /^[a-zA-Z0-9_-]{1,128}$/.test(command.actionId),
    'ACTION_ID',
    'Некорректный идентификатор действия',
  );
  const existing = input.processed[command.actionId];
  if (existing) {
    requireRule(
      existing.author === authenticatedUid,
      'ACTION_OWNER',
      'Идентификатор принадлежит другому участнику',
    );
    return { state: input, receipt: existing, duplicate: true };
  }
  requireRule(
    command.expectedVersion === input.version,
    'VERSION',
    'Состояние изменилось. Проверьте поле и повторите действие',
  );
  requireRule(command.setNumber === input.setNumber, 'SET', 'Этот сет уже завершён');
  const state = clone(input);
  const action = command.payload;
  requireRule(
    state.phase === 'playing' || state.phase === 'setResult',
    'FINISHED',
    'Матч уже завершён',
  );
  if (action.type === 'surrender' || action.type === 'exit') {
    state.winner = state.players.find((p) => p.uid !== authenticatedUid)!.uid;
    state.phase = 'finished';
    state.finishReason = action.type;
  } else if (action.type === 'ack') {
    requireRule(state.phase === 'setResult', 'PHASE', 'Сейчас нет результата для подтверждения');
    requireRule(
      !state.acknowledgements.includes(authenticatedUid),
      'ACK',
      'Результат уже подтверждён',
    );
    state.acknowledgements.push(authenticatedUid);
    if (state.acknowledgements.length === 2) beginSet(state);
  } else {
    requireRule(state.phase === 'playing', 'PHASE', 'Дождитесь следующего сета');
    requireRule(command.turnId === state.turnId, 'TURN_ID', 'Этот ход уже завершён');
    const position: TurnPosition = {
      players: state.players,
      currentPlayer: state.currentPlayer,
      passed: state.passed,
      remaining: state.mainDeck.length - state.deckIndex,
      handCardPlayed: state.handCardPlayed,
    };
    const reason = resolveTurn(position, authenticatedUid, action);
    state.passed = position.passed;
    state.handCardPlayed = position.handCardPlayed;
    if (reason) finishSet(state, reason);
    else if (action.type !== 'play') {
      const other = state.players.find((p) => p.uid !== authenticatedUid)!;
      state.currentPlayer = other.stopped ? authenticatedUid : other.uid;
      beginTurn(state);
    }
  }
  state.version++;
  const receipt: Receipt = {
    author: authenticatedUid,
    version: state.version,
    phase: state.phase,
    setNumber: state.setNumber,
  };
  state.processed[command.actionId] = receipt;
  return { state, receipt, duplicate: false };
}

export function interruptMatch(input: MatchState): MatchState {
  if (input.phase === 'finished' || input.phase === 'interrupted') return input;
  return {
    ...clone(input),
    phase: 'interrupted',
    winner: null,
    finishReason: 'disconnect',
    version: input.version + 1,
  };
}
