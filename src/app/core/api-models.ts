import { MatchState, PlayerState } from './models';
import { Lobby, Session } from './lobby';

export type PlayerView = Omit<PlayerState, 'sideDeck'> & { handCount: number };

export type MatchView = Omit<MatchState, 'players' | 'mainDeck' | 'rngState' | 'processed'> & {
  players: [PlayerView, PlayerView];
  mainDeckCount: number;
};

export interface RoomView {
  id: string;
  invitationId: string;
  members: [string, string];
  phase: 'preparing' | 'active' | 'closed';
  closedReason: 'cancelled' | 'disconnect' | null;
  fallbackSubmitted: boolean;
  ready: Record<string, boolean>;
  t0: number | null;
  version: number;
  match: MatchView | null;
}

export interface ApiSnapshot {
  revision: number;
  serverTime: number;
  session: Session | null;
  lobby: Lobby;
  room: RoomView | null;
  notice: string;
}

export function matchView(match: MatchState | null, viewer: string): MatchView | null {
  if (!match) return null;
  const { mainDeck, rngState, processed, players, ...visible } = match;
  const viewPlayer = ({ sideDeck, hand, ...publicPlayer }: PlayerState): PlayerView => ({
    ...publicPlayer,
    handCount: hand.length,
    hand: publicPlayer.uid === viewer ? hand : [],
  });
  return structuredClone({
    ...visible,
    mainDeckCount: mainDeck.length,
    players: [viewPlayer(players[0]), viewPlayer(players[1])],
  });
}
