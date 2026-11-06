import { computed, Injectable, signal } from '@angular/core';
import { CampaignService } from './campaign.service';
import { matchView } from './core/api-models';
import { botView, chooseBotAction } from './core/bot';
import { collectionBefore, selectDeck } from './core/catalog';
import { applyCommand, commandFor, createMatch, RULES } from './core/game-engine';
import { Action, MatchState, requireRule } from './core/models';
import { freshSeed, randomId, shuffled } from './core/random';

interface Preparation {
  planetId: number;
  deadline: number;
}

@Injectable({ providedIn: 'root' })
export class GameService {
  readonly humanUid = 'human';
  private readonly botUid = 'bot';
  private readonly current = signal<MatchState | null>(null);
  private readonly preparation = signal<Preparation | null>(null);
  readonly match = computed(() => matchView(this.current(), this.humanUid));
  readonly preparing = this.preparation.asReadonly();
  readonly error = signal('');
  private preparationTimer?: ReturnType<typeof setTimeout>;
  private botTimer?: ReturnType<typeof setTimeout>;

  constructor(readonly campaign: CampaignService) {}

  prepare(planetId: number): boolean {
    return this.perform(() => {
      requireRule(this.campaign.unlocked(planetId), 'PLANET_LOCKED', 'Планета ещё закрыта');
      requireRule(!this.preparation() && !this.current(), 'BUSY', 'Матч уже начат');
      this.preparation.set({ planetId, deadline: Date.now() + RULES.preparationMs });
      this.preparationTimer = setTimeout(() => this.startMatch([], true), RULES.preparationMs);
    });
  }

  start(ids: string[]): boolean {
    return this.startMatch(ids, false);
  }

  private startMatch(ids: string[], automatic: boolean): boolean {
    return this.perform(() => {
      const prep = this.preparation();
      requireRule(prep, 'PREPARATION', 'Выберите планету');
      const random = { rngState: freshSeed() };
      const collection = this.campaign.state().collection;
      const deck =
        automatic || Date.now() >= prep.deadline
          ? shuffled(collection, random).slice(0, RULES.sideDeck)
          : selectDeck(collection, ids);
      const botDeck = shuffled(collectionBefore(prep.planetId), random).slice(0, RULES.sideDeck);
      const match = createMatch({
        matchId: randomId(),
        mode: 'campaign',
        planetId: prep.planetId,
        uids: [this.humanUid, this.botUid],
        decks: [deck, botDeck],
        seed: random.rngState,
      });
      this.cancelPreparation();
      this.updateMatch(match);
    });
  }

  act(action: Action): boolean {
    return this.perform(() => {
      const match = this.current();
      requireRule(match, 'MATCH', 'Матч не найден');
      this.updateMatch(this.apply(match, this.humanUid, action));
    });
  }

  clear(): void {
    clearTimeout(this.botTimer);
    this.current.set(null);
    this.cancelPreparation();
    this.error.set('');
  }

  cancelPreparation(): void {
    clearTimeout(this.preparationTimer);
    this.preparation.set(null);
  }

  private apply(match: MatchState, uid: string, action: Action): MatchState {
    return applyCommand(match, commandFor(match, uid, action), uid).state;
  }

  private updateMatch(match: MatchState): void {
    clearTimeout(this.botTimer);
    if (match.phase === 'setResult' && !match.acknowledgements.includes(this.botUid)) {
      match = this.apply(match, this.botUid, { type: 'ack' });
    }
    this.current.set(match);
    this.campaign.recordResult(match, this.humanUid);
    if (match.phase === 'playing' && match.currentPlayer === this.botUid) {
      this.botTimer = setTimeout(() => {
        if (this.current() !== match) return;
        this.perform(() =>
          this.updateMatch(
            this.apply(match, this.botUid, chooseBotAction(botView(match, this.botUid))),
          ),
        );
      }, 650);
    }
  }

  private perform(work: () => void): boolean {
    this.error.set('');
    try {
      work();
      return true;
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Не удалось выполнить действие');
      return false;
    }
  }
}
