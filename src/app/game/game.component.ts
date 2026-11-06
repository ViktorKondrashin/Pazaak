import { Component, effect, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../game.service';
import { DeckBuilderComponent } from '../shared/deck-builder.component';
import { ConfirmComponent } from '../shared/confirm.component';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [DeckBuilderComponent, ConfirmComponent],
  template: `
    <app-deck-builder
      [collection]="game.campaign.state().collection"
      [selected]="game.campaign.selectedCards()"
      [seconds]="seconds"
      [modeLabel]="'КАМПАНИЯ · ПЛАНЕТА ' + game.preparing()?.planetId"
      [error]="game.error()"
      (selectionChange)="game.campaign.selectCards($event)"
      (start)="game.start(game.campaign.selectedCards())"
      (back)="back()"
    />
    @if (confirming) {
      <app-confirm
        message="Вы покинете подготовку к матчу."
        (accepted)="resolveLeave(true)"
        (cancelled)="resolveLeave(false)"
      />
    }
  `,
})
export class GameComponent implements OnInit, OnDestroy {
  seconds = 60;
  confirming = false;
  private timer?: ReturnType<typeof setInterval>;
  private leaveResolver?: (allowed: boolean) => void;

  constructor(
    readonly game: GameService,
    private router: Router,
  ) {
    effect(
      () => {
        if (this.game.match()) {
          this.resolveLeave(false);
          void this.router.navigate(['/gameplay']);
        }
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit(): void {
    this.tick();
    this.timer = setInterval(() => this.tick(), 250);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  private tick(): void {
    const prep = this.game.preparing();
    if (!prep) return;
    this.seconds = Math.max(0, Math.ceil((prep.deadline - Date.now()) / 1000));
  }

  back(): void {
    void this.router.navigate(['/campaign']);
  }

  canLeave(): boolean | Promise<boolean> {
    if (!this.game.preparing()) return true;
    this.confirming = true;
    return new Promise((resolve) => {
      this.leaveResolver = resolve;
    });
  }

  resolveLeave(allowed: boolean): void {
    this.confirming = false;
    if (allowed) this.game.cancelPreparation();
    this.leaveResolver?.(allowed);
    this.leaveResolver = undefined;
  }
}
