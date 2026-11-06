import { clone, requireRule } from './models';

export interface Session {
  uid: string;
  publicId: string;
  sessionId: string;
  status: 'idle' | 'invited' | 'playing' | 'offline';
  invitationId: string | null;
  roomId: string | null;
}

export interface Invitation {
  id: string;
  fromUid: string;
  toUid: string;
  createdAt: number;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'closed';
  roomId: string | null;
}

export interface Lobby {
  players: Record<string, Session>;
  invitations: Record<string, Invitation>;
}

export type Presence = Record<string, Record<string, boolean>>;

export const emptyLobby = (): Lobby => ({ players: {}, invitations: {} });
export const hydrateLobby = (data: Partial<Lobby> | null): Lobby => ({
  players: Object.fromEntries(
    Object.entries(data?.players ?? {}).map(([uid, player]) => [
      uid,
      { ...player, invitationId: player.invitationId ?? null, roomId: player.roomId ?? null },
    ]),
  ),
  invitations: Object.fromEntries(
    Object.entries(data?.invitations ?? {}).map(([id, invitation]) => [
      id,
      { ...invitation, roomId: invitation.roomId ?? null },
    ]),
  ),
});
export const isOnline = (session: Session, presence: Presence): boolean =>
  presence[session.uid]?.[session.sessionId] === true;

export function registerSession(input: Lobby, session: Session): Lobby {
  requireRule(/^[0-9]{8}$/.test(session.publicId), 'ID_FORMAT', 'Неправильный формат ID');
  requireRule(
    !Object.values(input.players).some(
      (p) => p.uid !== session.uid && p.publicId === session.publicId,
    ),
    'ID_TAKEN',
    'ID уже занят',
  );
  const existing = input.players[session.uid];
  requireRule(
    !existing || existing.status === 'idle' || existing.status === 'offline',
    'BUSY',
    'Сначала завершите текущую игру',
  );
  const lobby = clone(input);
  lobby.players[session.uid] = { ...session, status: 'idle', invitationId: null, roomId: null };
  return lobby;
}

export function sendInvitation(
  input: Lobby,
  presence: Presence,
  uid: string,
  publicId: string,
  id: string,
  now: number,
): Lobby {
  requireRule(/^[0-9]{8}$/.test(publicId), 'ID_FORMAT', 'Неправильный формат ID');
  const from = input.players[uid];
  const to = Object.values(input.players).find((p) => p.publicId === publicId);
  requireRule(from && isOnline(from, presence), 'OFFLINE', 'Нет соединения');
  requireRule(
    to && isOnline(to, presence) && to.status !== 'offline',
    'NOT_FOUND',
    'Игра не найдена',
  );
  requireRule(to.uid !== uid, 'SELF', 'Нельзя пригласить самого себя');
  requireRule(from.status === 'idle' && to.status === 'idle', 'BUSY', 'Игрок сейчас занят');
  requireRule(!input.invitations[id], 'INVITATION_ID', 'Приглашение уже существует');
  const lobby = clone(input);
  lobby.invitations[id] = {
    id,
    fromUid: uid,
    toUid: to.uid,
    status: 'pending',
    createdAt: now,
    roomId: null,
  };
  for (const playerUid of [uid, to.uid]) {
    lobby.players[playerUid].status = 'invited';
    lobby.players[playerUid].invitationId = id;
  }
  return lobby;
}

export function respondInvitation(
  input: Lobby,
  presence: Presence,
  uid: string,
  id: string,
  response: 'accept' | 'decline' | 'cancel',
  roomId: string,
): Lobby {
  const invitation = input.invitations[id];
  requireRule(
    invitation && [invitation.fromUid, invitation.toUid].includes(uid),
    'INVITATION',
    'Приглашение не найдено',
  );
  if (response === 'accept' && invitation.status === 'accepted' && invitation.toUid === uid)
    return input;
  requireRule(invitation.status === 'pending', 'INVITATION_CLOSED', 'Приглашение уже закрыто');
  requireRule(
    response === 'cancel' ? invitation.fromUid === uid : invitation.toUid === uid,
    'INVITATION_ROLE',
    'Это действие недоступно',
  );
  const uids = [invitation.fromUid, invitation.toUid];
  requireRule(
    uids.every((u) => input.players[u]?.invitationId === id),
    'INVITATION_STALE',
    'Приглашение устарело',
  );
  if (response === 'accept')
    requireRule(
      uids.every((u) => isOnline(input.players[u], presence)),
      'OFFLINE',
      'Игрок вышел',
    );
  const lobby = clone(input);
  lobby.invitations[id].status =
    response === 'accept' ? 'accepted' : response === 'decline' ? 'declined' : 'cancelled';
  lobby.invitations[id].roomId = response === 'accept' ? roomId : null;
  for (const playerUid of uids) {
    const player = lobby.players[playerUid];
    player.status = response === 'accept' ? 'playing' : 'idle';
    player.roomId = response === 'accept' ? roomId : null;
    if (response !== 'accept') player.invitationId = null;
  }
  return lobby;
}

/** Cleanup is guarded by both identifiers: late callbacks cannot release a new match. */
export function releaseSession(
  input: Lobby,
  uid: string,
  invitationId: string,
  roomId: string | null,
): Lobby {
  const lobby = clone(input);
  const player = lobby.players[uid];
  if (player?.invitationId === invitationId && player.roomId === roomId) {
    player.status = 'idle';
    player.invitationId = null;
    player.roomId = null;
  }
  const invitation = lobby.invitations[invitationId];
  if (
    invitation &&
    ![invitation.fromUid, invitation.toUid].some(
      (u) => lobby.players[u]?.invitationId === invitationId,
    )
  )
    invitation.status = 'closed';
  return lobby;
}

export function cancelDisconnectedInvitation(input: Lobby, presence: Presence, id: string): Lobby {
  const invitation = input.invitations[id];
  if (!invitation || invitation.status !== 'pending') return input;
  if ([invitation.fromUid, invitation.toUid].every((u) => isOnline(input.players[u], presence)))
    return input;
  let lobby = clone(input);
  lobby.invitations[id].status = 'cancelled';
  for (const uid of [invitation.fromUid, invitation.toUid])
    lobby = releaseSession(lobby, uid, id, null);
  return lobby;
}

export function cancelAcceptedInvitation(
  input: Lobby,
  uid: string,
  id: string,
  roomExists: boolean,
): Lobby {
  const invitation = input.invitations[id];
  requireRule(
    invitation && [invitation.fromUid, invitation.toUid].includes(uid),
    'MEMBER',
    'Это не ваше приглашение',
  );
  requireRule(invitation.status === 'accepted', 'INVITATION_CLOSED', 'Приглашение уже закрыто');
  requireRule(!roomExists, 'ROOM_EXISTS', 'Сначала закройте созданную комнату');
  let lobby = clone(input);
  lobby.invitations[id].status = 'cancelled';
  for (const player of [invitation.fromUid, invitation.toUid])
    lobby = releaseSession(lobby, player, id, invitation.roomId);
  return lobby;
}
