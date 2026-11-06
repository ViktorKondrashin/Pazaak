import { clone, MatchState, PlayerState, TurnAction } from './models';
import { compareScores, resolveTurn, TurnPosition } from './game-engine';

export interface BotView {
  self: PlayerState;
  opponent: Omit<PlayerState, 'hand' | 'sideDeck'>;
  remaining: number;
  passed: string[];
  handCardPlayed: boolean;
}

export function botView(state: MatchState, uid: string): BotView {
  const self = state.players.find((p) => p.uid === uid)!;
  const other = state.players.find((p) => p.uid !== uid)!;
  const { hand: _hand, sideDeck: _deck, ...opponent } = other;
  return {
    self: clone(self),
    opponent: clone(opponent),
    remaining: state.mainDeck.length - state.deckIndex,
    passed: [...state.passed],
    handCardPlayed: state.handCardPlayed,
  };
}

export function chooseBotAction(view: BotView): TurnAction {
  const actions: TurnAction[] = [{ type: 'stop' }, { type: 'pass' }];
  for (const card of (view.handCardPlayed ? [] : [...view.self.hand]).sort((a, b) =>
    a.instanceId < b.instanceId ? -1 : a.instanceId > b.instanceId ? 1 : 0,
  )) {
    if (card.kind === 'dual')
      actions.push(
        { type: 'play', instanceId: card.instanceId, sign: 1 },
        { type: 'play', instanceId: card.instanceId, sign: -1 },
      );
    else actions.push({ type: 'play', instanceId: card.instanceId });
  }
  const variants = actions.map((action) => {
    const position: TurnPosition = {
      players: [clone(view.self), { ...clone(view.opponent), hand: [], sideDeck: [] }],
      currentPlayer: view.self.uid,
      passed: [...view.passed],
      remaining: view.remaining,
      handCardPlayed: view.handCardPlayed,
    };
    let reason = resolveTurn(position, view.self.uid, action);
    // A hand card can now be followed by Stop in this same turn.
    if (action.type === 'play' && !reason) {
      const stopped = clone(position);
      const stopReason = resolveTurn(stopped, view.self.uid, { type: 'stop' });
      if (stopReason && compareScores(stopped.players[0].score, stopped.players[1].score) !== 1)
        reason = stopReason;
    }
    const result = reason
      ? compareScores(position.players[0].score, position.players[1].score)
      : undefined;
    return { action, score: position.players[0].score, result };
  });
  let selected = variants.find((v) => v.result === 0);
  selected ??= variants.find((v) => v.score === 20 && v.result !== 1);
  selected ??= variants.find((v) => v.result === null);
  if (selected) return selected.action;
  const bestCard = (improvement: boolean) =>
    variants
      .filter(
        (v) =>
          v.action.type === 'play' &&
          v.score <= 20 &&
          v.result !== 1 &&
          (!improvement || v.score > view.self.score),
      )
      .sort((a, b) => b.score - a.score)[0]?.action;
  if (view.self.score > 20) return bestCard(false) ?? { type: 'stop' };
  if (!view.opponent.stopped && view.self.score >= 18 && view.self.score <= 19)
    return { type: 'stop' };
  return bestCard(true) ?? { type: 'pass' };
}
