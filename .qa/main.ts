import { Component, computed, inject, provideZoneChangeDetection, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { AppComponent } from '../src/app/app.component';
import { routes } from '../src/app/app.routes';
import { CampaignService } from '../src/app/campaign.service';
import { GameBoardComponent } from '../src/app/game-board/game-board.component';
import { Action, MatchState } from '../src/app/core/models';
import { applyCommand, commandFor, createMatch } from '../src/app/core/game-engine';
import { collectionBefore } from '../src/app/core/catalog';
import { matchView } from '../src/app/core/api-models';

@Component({
  standalone: true,
  imports: [GameBoardComponent],
  template: `
    @if (view(); as match) {
      <app-game-board
        [match]="match"
        uid="human"
        (action)="act($event)"
        (complete)="done()"
      />
    } @else {
      <main class="page">
        <h1>Локальные проверки</h1>
        <p>Тестовая сборка</p>
        <div class="button-row">
          <button
            class="button"
            (click)="win()"
          >
            Первая победа
          </button>
          <button
            class="button"
            (click)="allRewards()"
          >
            Все награды
          </button>
          <button
            class="button"
            (click)="board()"
          >
            Контрольные 20 очков
          </button>
          <button
            class="button"
            (click)="map()"
          >
            Карта планет
          </button>
          <button
            class="button"
            (click)="cleanup()"
          >
            Перезапустить страницу
          </button>
        </div>
      </main>
    }
  `,
})
class HarnessComponent {
  campaign = inject(CampaignService);
  router = inject(Router);
  private readonly match = signal<MatchState | null>(null);
  readonly view = computed(() => matchView(this.match(), 'human'));

  winner(id: number): MatchState {
    const cards = collectionBefore(6).slice(0, 10);
    const match = createMatch({
      matchId: `qa-planet-${id}`,
      mode: 'campaign',
      planetId: id,
      uids: ['human', 'bot'],
      decks: [cards, cards],
      seed: 17,
    });
    match.phase = 'finished';
    match.winner = 'human';
    match.finishReason = 'sets';
    match.players[0].wins = 3;
    return match;
  }

  win(): void {
    this.campaign.recordResult(this.winner(1), 'human');
    this.map();
  }

  allRewards(): void {
    for (let id = 1; id <= 5; id++) this.campaign.recordResult(this.winner(id), 'human');
    this.map();
  }

  map(): void {
    void this.router.navigate(['/campaign']);
  }

  cleanup(): void {
    location.assign('/');
  }

  board(): void {
    const m = this.winner(1);
    m.matchId = 'qa-auto-stop';
    m.phase = 'playing';
    m.winner = null;
    m.finishReason = null;
    m.currentPlayer = 'human';
    m.players[0].wins = 1;
    m.players[1].wins = 2;
    m.players.forEach((p, i) => {
      p.board = [
        { instanceId: `qa-${i}-1`, typeId: 'main-10', kind: 'main', value: 10, signedValue: 10 },
        { instanceId: `qa-${i}-2`, typeId: 'main-10', kind: 'main', value: 10, signedValue: 10 },
      ];
      p.score = 20;
      p.stopped = i === 1;
    });
    m.players[0].hand = [
      collectionBefore(6)[40],
      collectionBefore(6)[0],
      collectionBefore(6)[15],
      collectionBefore(6)[9],
    ];
    this.match.set(m);
  }

  act(action: Action): void {
    let match = this.match();
    if (!match) return;
    match = applyCommand(match, commandFor(match, 'human', action), 'human').state;
    if (match.phase === 'setResult' && !match.acknowledgements.includes('bot'))
      match = applyCommand(match, commandFor(match, 'bot', { type: 'ack' }), 'bot').state;
    this.match.set(match);
  }

  done(): void {
    this.match.set(null);
  }
}

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter([{ path: 'qa', component: HarnessComponent }, ...routes]),
  ],
}).catch(console.error);
