import { Component, effect, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PvpService } from '../pvp.service';
import { CampaignService } from '../campaign.service';
import { Action } from '../core/models';
import { RULES } from '../core/game-engine';
import { freshSeed, shuffled } from '../core/random';
import { GameBoardComponent } from '../game-board/game-board.component';
import { DeckBuilderComponent } from '../shared/deck-builder.component';
import { ConfirmComponent } from '../shared/confirm.component';

@Component({
  selector: 'app-pvp-game',
  standalone: true,
  imports: [GameBoardComponent, DeckBuilderComponent, ConfirmComponent],
  template: `
    @if (pvp.room(); as room) {
      @if (room.phase === 'preparing') {
        @if (room.t0 === null) {
          <main class="page">
            <section class="panel">
              <h1>Подключение игроков…</h1>
              <p>Ожидаем готовности к выбору карт.</p>
              @if (!pvp.connected()) {
                <p class="error">Нет соединения</p>
              }
              @if (pvp.error()) {
                <p class="error">{{ pvp.error() }}</p>
              }
              @if (!room.fallbackSubmitted && pvp.connected() && pvp.error()) {
                <button
                  class="button"
                  [disabled]="pvp.busy()"
                  (click)="sendFallback(room.id)"
                >
                  Повторить
                </button>
              }
              <button
                class="button subtle"
                [disabled]="pvp.busy()"
                (click)="back()"
              >
                Отменить
              </button>
            </section>
          </main>
        } @else {
          <app-deck-builder
            [collection]="campaign.state().collection"
            [selected]="selected"
            [seconds]="seconds"
            [locked]="pvp.busy() || !pvp.connected() || !!room.ready[uid]"
            [waiting]="!!room.ready[uid]"
            modeLabel="СЕТЕВОЙ МАТЧ"
            [error]="
              pvp.error() || (!pvp.connected() ? 'Нет соединения. Действия заблокированы.' : '')
            "
            (selectionChange)="select($event)"
            (start)="pvp.ready(selected)"
            (back)="back()"
          />
        }
      } @else if (room.phase === 'closed') {
        <main class="page">
          <div class="overlay">
            <section
              class="modal"
              role="dialog"
              aria-modal="true"
            >
              <span class="eyebrow">ПОДГОТОВКА ЗАВЕРШЕНА</span>
              <h2>{{ room.closedReason === 'disconnect' ? 'Игрок вышел' : 'Матч отменён' }}</h2>
              <p>Победитель не назначен.</p>
              <button
                class="button primary"
                [disabled]="pvp.busy() || !pvp.connected()"
                (click)="complete()"
              >
                ОК
              </button>
              @if (pvp.error()) {
                <p class="error">{{ pvp.error() }}</p>
              }
            </section>
          </div>
        </main>
      } @else if (room.match) {
        <app-game-board
          [match]="room.match"
          [uid]="uid"
          [connected]="pvp.connected()"
          [busy]="pvp.busy()"
          [error]="pvp.error()"
          (action)="act($event)"
          (complete)="complete()"
          (offlineExit)="offlineExit()"
        />
      }
    }
    @if (confirming) {
      <app-confirm
        [message]="
          pvp.room()?.phase === 'preparing'
            ? 'Подготовка будет отменена для обоих участников.'
            : 'Вы покинете матч. Победа будет засчитана сопернику.'
        "
        (accepted)="resolveLeave(true)"
        (cancelled)="resolveLeave(false)"
      />
    }
  `,
})
export class PvpGameComponent implements OnInit, OnDestroy {
  selected: string[] = [];
  seconds = 60;
  confirming = false;
  private timer?: ReturnType<typeof setInterval>;
  private leaveResolver?: (allowed: boolean) => void;
  private fallback?: string[];

  constructor(
    readonly pvp: PvpService,
    readonly campaign: CampaignService,
    private router: Router,
  ) {
    effect(
      () => {
        const room = this.pvp.room();
        if (
          room?.phase !== 'preparing' ||
          room.fallbackSubmitted ||
          !this.pvp.connected() ||
          this.pvp.busy() ||
          this.fallback
        )
          return;
        void this.sendFallback(room.id);
      },
      { allowSignalWrites: true },
    );
  }

  async sendFallback(roomId: string): Promise<void> {
    this.fallback ??= shuffled(this.campaign.state().collection, { rngState: freshSeed() })
      .slice(0, RULES.sideDeck)
      .map((card) => card.instanceId);
    await this.pvp.sendFallback(roomId, this.fallback);
  }

  get uid(): string {
    return this.pvp.session()?.uid ?? '';
  }

  ngOnInit(): void {
    this.selected = [...this.campaign.selectedCards()];
    this.tick();
    this.timer = setInterval(() => this.tick(), 250);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  private tick(): void {
    const t0 = this.pvp.room()?.t0;
    this.seconds =
      t0 == null ? 60 : Math.max(0, Math.ceil((t0 + RULES.preparationMs - this.pvp.now) / 1000));
  }

  select(ids: string[]): void {
    this.selected = ids;
    this.campaign.selectCards(ids);
  }

  async act(action: Action): Promise<void> {
    await this.pvp.act(action);
    if (action.type === 'exit' && this.pvp.room()?.match?.phase === 'finished')
      await this.complete();
  }

  async complete(): Promise<void> {
    if (await this.pvp.finishViewing()) await this.router.navigate(['/pvp-lobby']);
  }

  async offlineExit(): Promise<void> {
    await this.pvp.abandonOffline();
    await this.router.navigate(['/']);
  }

  back(): void {
    void this.router.navigate(['/pvp-lobby']);
  }

  canLeave(): boolean | Promise<boolean> {
    const room = this.pvp.room();
    if (!room) return true;
    if (!this.pvp.connected()) return this.pvp.abandonOffline().then(() => true);
    if (
      room.phase === 'closed' ||
      room.match?.phase === 'finished' ||
      room.match?.phase === 'interrupted'
    )
      return this.pvp.finishViewing();
    this.confirming = true;
    return new Promise((resolve) => {
      this.leaveResolver = resolve;
    });
  }

  async resolveLeave(allowed: boolean): Promise<void> {
    this.confirming = false;
    if (allowed) {
      if (this.pvp.room()?.phase === 'preparing') allowed = await this.pvp.cancelPreparation();
      else {
        await this.pvp.act({ type: 'exit' });
        allowed = this.pvp.room()?.match?.phase === 'finished' && (await this.pvp.finishViewing());
      }
    }
    this.leaveResolver?.(allowed);
    this.leaveResolver = undefined;
  }
}
