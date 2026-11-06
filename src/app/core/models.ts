export type CardKind = 'main' | 'positive' | 'negative' | 'dual' | 'flip24' | 'flip36';

export interface Card {
  instanceId: string;
  typeId: string;
  kind: CardKind;
  value: number;
}

export interface BoardCard extends Card {
  signedValue: number;
}

export interface PlayerState {
  uid: string;
  sideDeck: Card[];
  hand: Card[];
  board: BoardCard[];
  score: number;
  wins: number;
  stopped: boolean;
}

export type Phase = 'playing' | 'setResult' | 'finished' | 'interrupted';

export type TurnAction =
  | { type: 'play'; instanceId: string; sign?: 1 | -1 }
  | { type: 'pass' }
  | { type: 'stop' };

export type Action = TurnAction | { type: 'ack' } | { type: 'surrender' } | { type: 'exit' };

export interface SetResult {
  setNumber: number;
  winner: string | null;
  scores: [number, number];
  reason: 'stopped' | 'nineCards' | 'emptyDeck';
}

export interface Receipt {
  author: string;
  version: number;
  phase: Phase;
  setNumber: number;
}

export interface MatchState {
  matchId: string;
  mode: 'campaign' | 'pvp';
  planetId: number | null;
  players: [PlayerState, PlayerState];
  phase: Phase;
  currentPlayer: string;
  mainDeck: Card[];
  deckIndex: number;
  rngState: number;
  setNumber: number;
  turnId: number;
  handCardPlayed: boolean;
  version: number;
  passed: string[];
  acknowledgements: string[];
  result: SetResult | null;
  winner: string | null;
  finishReason: 'sets' | 'surrender' | 'exit' | 'disconnect' | null;
  processed: Record<string, Receipt>;
}

export interface Command {
  roomId: string;
  author: string;
  actionId: string;
  expectedVersion: number;
  setNumber: number;
  turnId: number;
  payload: Action;
}

export class GameError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'GameError';
  }
}

export function requireRule(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) throw new GameError(code, message);
}

export const clone = <T>(value: T): T => structuredClone(value);
