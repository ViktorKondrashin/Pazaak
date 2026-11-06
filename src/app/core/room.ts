import { Card, clone, Command, MatchState, requireRule } from './models';
import { Invitation, Lobby, Presence } from './lobby';
import { collectionBefore, selectDeck } from './catalog';
import { applyCommand, createMatch, interruptMatch, RULES } from './game-engine';

export interface Room {
  id: string;
  invitationId: string;
  members: [string, string];
  sessions: Record<string, string>;
  phase: 'preparing' | 'active' | 'closed';
  closedReason: 'cancelled' | 'disconnect' | null;
  fallbackDecks: Record<string, Card[]>;
  decks: Record<string, Card[]>;
  ready: Record<string, boolean>;
  t0: number | null;
  rngState: number;
  match: MatchState | null;
  confirmations: Record<string, boolean>;
  version: number;
}

export function makeRoom(invitation: Invitation, lobby: Lobby, seed: number): Room {
  requireRule(
    invitation.status === 'accepted' && invitation.roomId,
    'INVITATION',
    'Приглашение не принято',
  );
  const members: [string, string] = [invitation.fromUid, invitation.toUid];
  requireRule(
    members.every(
      (u) =>
        lobby.players[u]?.invitationId === invitation.id &&
        lobby.players[u]?.roomId === invitation.roomId,
    ),
    'INVITATION_STALE',
    'Приглашение уже отменено',
  );
  return {
    id: invitation.roomId,
    invitationId: invitation.id,
    members,
    sessions: Object.fromEntries(members.map((u) => [u, lobby.players[u].sessionId])),
    phase: 'preparing',
    closedReason: null,
    fallbackDecks: {},
    decks: {},
    ready: {},
    t0: null,
    rngState: seed >>> 0,
    match: null,
    confirmations: {},
    version: 0,
  };
}

/** Normalize optional fields when loading a serialized room. */
export function hydrateRoom(value: Room | null): Room | null {
  if (!value) return null;
  const room = clone(value);
  room.fallbackDecks ??= {};
  room.decks ??= {};
  room.ready ??= {};
  room.confirmations ??= {};
  room.t0 ??= null;
  room.match ??= null;
  room.closedReason ??= null;
  if (room.match) {
    const match = room.match;
    match.handCardPlayed ??= false;
    match.passed ??= [];
    match.acknowledgements ??= [];
    match.processed ??= {};
    match.result ??= null;
    match.winner ??= null;
    match.finishReason ??= null;
    match.planetId ??= null;
    if (match.result) match.result.winner ??= null;
    for (const player of match.players) {
      player.hand ??= [];
      player.board ??= [];
      player.sideDeck ??= [];
    }
  }
  return room;
}

function member(room: Room, uid: string): void {
  requireRule(room.members.includes(uid), 'MEMBER', 'Вы не участник этой комнаты');
}

export function submitFallbackDeck(input: Room, uid: string, ids: string[], now: number): Room {
  member(input, uid);
  if (input.fallbackDecks[uid]) return input;
  requireRule(input.phase === 'preparing', 'PHASE', 'Подготовка уже завершена');
  const room = clone(input);
  room.fallbackDecks[uid] = selectDeck(collectionBefore(6), ids);
  if (room.members.every((u) => !!room.fallbackDecks[u])) room.t0 = now;
  room.version++;
  return room;
}

export function prepareTick(input: Room, now: number): Room {
  if (input.phase !== 'preparing' || input.t0 === null) return input;
  const room = clone(input);
  let changed = false;
  if (now >= room.t0! + RULES.preparationMs) {
    for (const uid of room.members)
      if (!room.ready[uid]) {
        room.decks[uid] = room.fallbackDecks[uid];
        room.ready[uid] = true;
        changed = true;
      }
  }
  if (room.members.every((u) => room.ready[u])) {
    const decks: [Card[], Card[]] = [room.decks[room.members[0]], room.decks[room.members[1]]];
    room.match = createMatch({
      matchId: room.id,
      mode: 'pvp',
      uids: room.members,
      decks,
      seed: room.rngState,
    });
    room.rngState = room.match.rngState;
    room.phase = 'active';
    changed = true;
  }
  if (changed) {
    room.version++;
    return room;
  }
  return input;
}

export function submitDeck(input: Room, uid: string, ids: string[], now: number): Room {
  member(input, uid);
  requireRule(input.phase === 'preparing' && input.t0 !== null, 'PHASE', 'Дождитесь обоих игроков');
  const ticked = prepareTick(input, now);
  if (ticked.phase !== 'preparing') return ticked;
  requireRule(!input.ready[uid], 'READY', 'Колода уже подтверждена');
  const room = clone(input);
  room.decks[uid] = selectDeck(collectionBefore(6), ids);
  room.ready[uid] = true;
  room.version++;
  return prepareTick(room, now);
}

export function applyRoomCommand(input: Room, uid: string, command: Command): Room {
  member(input, uid);
  requireRule(input.phase === 'active' && input.match, 'PHASE', 'Матч ещё не начался');
  const result = applyCommand(input.match, command, uid);
  if (result.duplicate) return input;
  return {
    ...input,
    match: result.state,
    rngState: result.state.rngState,
    version: input.version + 1,
  };
}

export function closePreparation(input: Room, uid: string): Room {
  member(input, uid);
  if (input.phase === 'closed') return input;
  requireRule(input.phase === 'preparing', 'PHASE', 'Матч уже начался');
  return {
    ...clone(input),
    phase: 'closed',
    closedReason: 'cancelled',
    version: input.version + 1,
  };
}

export function checkDisconnect(input: Room, presence: Presence): Room {
  if (
    input.phase === 'closed' ||
    input.match?.phase === 'finished' ||
    input.match?.phase === 'interrupted'
  )
    return input;
  // Only an explicit presence false is an observed disconnect.
  if (!input.members.some((u) => presence[u]?.[input.sessions[u]] === false)) return input;
  return input.match
    ? { ...input, match: interruptMatch(input.match), version: input.version + 1 }
    : { ...input, phase: 'closed', closedReason: 'disconnect', version: input.version + 1 };
}

export function confirmRoom(input: Room, uid: string): Room {
  member(input, uid);
  requireRule(
    input.phase === 'closed' ||
      input.match?.phase === 'finished' ||
      input.match?.phase === 'interrupted',
    'PHASE',
    'Матч ещё не завершён',
  );
  if (input.confirmations[uid]) return input;
  return {
    ...input,
    confirmations: { ...input.confirmations, [uid]: true },
    version: input.version + 1,
  };
}
