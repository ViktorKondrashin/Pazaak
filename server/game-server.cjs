const { randomBytes, randomInt, randomUUID, createHash } = require('node:crypto');
const { Store } = require('./store.cjs');
const { GameError, requireRule } = require('../dist/server/core/models.js');
const { RULES } = require('../dist/server/core/game-engine.js');
const { matchView } = require('../dist/server/core/api-models.js');
const {
  registerSession,
  sendInvitation,
  respondInvitation,
  releaseSession,
  cancelDisconnectedInvitation,
} = require('../dist/server/core/lobby.js');
const {
  makeRoom,
  submitFallbackDeck,
  prepareTick,
  submitDeck,
  applyRoomCommand,
  checkDisconnect,
  closePreparation,
  confirmRoom,
} = require('../dist/server/core/room.js');

const hash = (token) => createHash('sha256').update(token).digest('hex');
const seed = () => randomInt(1, 0x100000000);
const cardIds = (value) => {
  requireRule(
    Array.isArray(value) &&
      value.length <= 10 &&
      value.every((id) => typeof id === 'string' && id.length <= 100),
    'INPUT',
    'Некорректный список карт',
  );
  return value;
};

function validateCommand(command) {
  requireRule(
    command &&
      typeof command === 'object' &&
      typeof command.roomId === 'string' &&
      typeof command.author === 'string' &&
      typeof command.actionId === 'string' &&
      [command.expectedVersion, command.setNumber, command.turnId].every(Number.isSafeInteger) &&
      command.payload &&
      typeof command.payload === 'object',
    'INPUT',
    'Некорректная команда',
  );
  const action = command.payload;
  requireRule(
    ['play', 'pass', 'stop', 'ack', 'surrender', 'exit'].includes(action.type),
    'ACTION',
    'Неизвестное действие',
  );
  if (action.type === 'play')
    requireRule(
      typeof action.instanceId === 'string' && action.instanceId.length <= 100,
      'INPUT',
      'Некорректная карта',
    );
}

function roomView(room, uid) {
  if (!room) return null;
  return {
    id: room.id,
    invitationId: room.invitationId,
    members: room.members,
    phase: room.phase,
    closedReason: room.closedReason,
    fallbackSubmitted: !!room.fallbackDecks[uid],
    ready: room.ready,
    t0: room.t0,
    version: room.version,
    match: matchView(room.match, uid),
  };
}

class GameServer {
  constructor({ database = ':memory:', clock = Date.now, disconnectMs = 45_000 } = {}) {
    this.store = new Store(database);
    this.clock = clock;
    this.disconnectMs = disconnectMs;
  }

  createSession() {
    const token = randomBytes(32).toString('base64url'),
      uid = randomUUID(),
      now = this.clock();
    this.store.update((state) => {
      requireRule(
        Object.keys(state.profiles).length < 500,
        'CAPACITY',
        'Сервер занят. Попробуйте позже',
      );
      state.profiles[uid] = {
        uid,
        tokenHash: hash(token),
        lastSeen: now,
        offlineAt: null,
        notice: '',
        network: false,
      };
    });
    return { token, ...this.snapshot(uid) };
  }

  authenticate(token) {
    requireRule(
      typeof token === 'string' && token.length >= 40 && token.length <= 100,
      'AUTH',
      'Сеанс завершён. Обновите страницу',
    );
    const digest = hash(token);
    const profile = Object.values(this.store.state.profiles).find((p) => p.tokenHash === digest);
    requireRule(profile && profile.offlineAt === null, 'AUTH', 'Сеанс завершён. Обновите страницу');
    return profile.uid;
  }

  snapshot(uid) {
    const state = this.store.state,
      profile = state.profiles[uid];
    requireRule(profile, 'AUTH', 'Сеанс завершён. Обновите страницу');
    const player = state.lobby.players[uid];
    const invitation = player?.invitationId ? state.lobby.invitations[player.invitationId] : null;
    const players = {};
    for (const id of invitation ? [invitation.fromUid, invitation.toUid] : [uid]) {
      if (state.lobby.players[id]) players[id] = state.lobby.players[id];
    }
    return {
      revision: state.revision,
      serverTime: this.clock(),
      session: profile.network ? player || null : null,
      lobby: { players, invitations: invitation ? { [invitation.id]: invitation } : {} },
      room: roomView(player?.roomId ? state.rooms[player.roomId] : null, uid),
      notice: profile.notice,
    };
  }

  request(uid, operation, body = {}) {
    requireRule(
      body && typeof body === 'object' && !Array.isArray(body),
      'INPUT',
      'Ожидается объект JSON',
    );
    const now = this.clock();
    this.maintain();
    this.store.update((state) => {
      const profile = state.profiles[uid];
      requireRule(
        profile && profile.offlineAt === null,
        'AUTH',
        'Сеанс завершён. Обновите страницу',
      );
      profile.lastSeen = now;
      const player = state.lobby.players[uid];
      const getRoom = () => {
        requireRule(player?.roomId && state.rooms[player.roomId], 'ROOM', 'Комната не найдена');
        requireRule(body.roomId === player.roomId, 'ROOM', 'Команда адресована другой комнате');
        return state.rooms[player.roomId];
      };
      switch (operation) {
        case 'state':
          break;
        case 'lobby/connect': {
          if (!player || player.status === 'offline') {
            let publicId;
            do {
              publicId = String(randomInt(100_000_000)).padStart(8, '0');
            } while (Object.values(state.lobby.players).some((p) => p.publicId === publicId));
            const session = {
              uid,
              sessionId: randomUUID(),
              publicId,
              status: 'idle',
              invitationId: null,
              roomId: null,
            };
            state.lobby = registerSession(state.lobby, session);
          }
          const session = state.lobby.players[uid];
          state.presence[uid] = { [session.sessionId]: true };
          profile.network = true;
          break;
        }
        case 'lobby/invite': {
          requireRule(typeof body.publicId === 'string', 'ID_FORMAT', 'Неправильный формат ID');
          state.lobby = sendInvitation(
            state.lobby,
            state.presence,
            uid,
            body.publicId,
            randomUUID(),
            now,
          );
          profile.notice = '';
          const invite = state.lobby.invitations[state.lobby.players[uid].invitationId];
          state.profiles[invite.toUid].notice = '';
          break;
        }
        case 'lobby/respond': {
          requireRule(
            ['accept', 'decline', 'cancel'].includes(body.response),
            'INPUT',
            'Некорректный ответ',
          );
          requireRule(
            typeof body.invitationId === 'string',
            'INVITATION',
            'Приглашение не найдено',
          );
          state.lobby = respondInvitation(
            state.lobby,
            state.presence,
            uid,
            body.invitationId,
            body.response,
            body.invitationId,
          );
          const invitation = state.lobby.invitations[body.invitationId];
          if (invitation.status === 'accepted' && !state.rooms[invitation.roomId]) {
            state.rooms[invitation.roomId] = makeRoom(invitation, state.lobby, seed());
          } else if (body.response !== 'accept') {
            for (const member of [invitation.fromUid, invitation.toUid])
              state.profiles[member].notice =
                body.response === 'decline' ? 'Игрок отклонил приглашение' : 'Приглашение отменено';
          }
          break;
        }
        case 'room/fallback': {
          const room = getRoom();
          state.rooms[room.id] = submitFallbackDeck(room, uid, cardIds(body.ids), now);
          break;
        }
        case 'room/ready': {
          const room = getRoom();
          state.rooms[room.id] = submitDeck(room, uid, cardIds(body.ids), now);
          break;
        }
        case 'room/command': {
          const room = getRoom();
          validateCommand(body.command);
          state.rooms[room.id] = applyRoomCommand(room, uid, body.command);
          break;
        }
        case 'room/cancel': {
          const room = getRoom();
          state.rooms[room.id] = closePreparation(room, uid);
          break;
        }
        case 'room/finish': {
          const room = getRoom();
          state.rooms[room.id] = confirmRoom(room, uid);
          state.lobby = releaseSession(state.lobby, uid, room.invitationId, room.id);
          if (
            room.members.every(
              (member) =>
                state.rooms[room.id].confirmations[member] ||
                !state.profiles[member] ||
                state.profiles[member].offlineAt !== null,
            )
          )
            delete state.rooms[room.id];
          break;
        }
        case 'lobby/leave': {
          if (!player) break;
          requireRule(
            !player.roomId && !player.invitationId,
            'BUSY',
            'Сначала завершите текущий матч или приглашение',
          );
          player.status = 'offline';
          profile.network = false;
          state.presence[uid] = { [player.sessionId]: false };
          break;
        }
        case 'session/close':
          this.disconnect(state, uid, now);
          break;
        default:
          throw new GameError('NOT_FOUND', 'Метод API не найден');
      }
    });
    return this.snapshot(uid);
  }

  disconnect(state, uid, now) {
    const profile = state.profiles[uid];
    if (!profile || profile.offlineAt !== null) return;
    profile.offlineAt = now;
    profile.network = false;
    const player = state.lobby.players[uid];
    if (!player) return;
    state.presence[uid] = { [player.sessionId]: false };
    player.status = 'offline';
    for (const invitation of Object.values(state.lobby.invitations))
      if ([invitation.fromUid, invitation.toUid].includes(uid))
        state.lobby = cancelDisconnectedInvitation(state.lobby, state.presence, invitation.id);
    if (player.roomId && state.rooms[player.roomId])
      state.rooms[player.roomId] = checkDisconnect(state.rooms[player.roomId], state.presence);
  }

  maintain() {
    const now = this.clock(),
      state = this.store.state;
    const expired = Object.values(state.profiles).some(
      (p) => p.offlineAt === null && now - p.lastSeen > this.disconnectMs,
    );
    const rooms = Object.values(state.rooms).some(
      (r) => r.phase === 'preparing' && r.t0 !== null && now >= r.t0 + RULES.preparationMs,
    );
    const cleanup = Object.values(state.profiles).some(
      (p) => p.offlineAt !== null && now - p.offlineAt > 300_000,
    );
    if (!expired && !rooms && !cleanup) return;
    this.store.update((next) => {
      for (const profile of Object.values(next.profiles)) {
        if (profile.offlineAt === null && now - profile.lastSeen > this.disconnectMs)
          this.disconnect(next, profile.uid, now);
      }
      for (const room of Object.values(next.rooms)) next.rooms[room.id] = prepareTick(room, now);
      // Remove abandoned rooms once both sessions are gone; keep results for the remaining viewer.
      for (const room of Object.values(next.rooms)) {
        if (
          room.members.every(
            (uid) =>
              !next.profiles[uid] ||
              (next.profiles[uid].offlineAt !== null &&
                now - next.profiles[uid].offlineAt > 300_000),
          )
        )
          delete next.rooms[room.id];
      }
      for (const [uid, profile] of Object.entries(next.profiles)) {
        if (profile.offlineAt !== null && now - profile.offlineAt > 300_000) {
          delete next.profiles[uid];
          delete next.lobby.players[uid];
          delete next.presence[uid];
        }
      }
      for (const [id, invitation] of Object.entries(next.lobby.invitations)) {
        if (
          ![invitation.fromUid, invitation.toUid].some(
            (uid) => next.lobby.players[uid]?.invitationId === id,
          )
        )
          delete next.lobby.invitations[id];
      }
    });
  }

  close() {
    this.store.close();
  }
}

module.exports = { GameServer, matchView };
