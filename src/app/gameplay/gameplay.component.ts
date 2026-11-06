import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../game.service';
import { Action } from '../core/models';
import { GameBoardComponent } from '../game-board/game-board.component';
import { ConfirmComponent } from '../shared/confirm.component';

@Component({
  selector: 'app-gameplay',
  standalone: true,
  imports: [GameBoardComponent, ConfirmComponent],
  template: `
    @if (game.match(); as match) {
      <app-game-board
        [match]="match"
        [uid]="game.humanUid"
        [error]="game.error()"
        (action)="act($event)"
        (complete)="complete()"
      />
    }
    @if (confirming) {
      <app-confirm
        message="Вы покинете матч. Победа будет засчитана сопернику."
        (accepted)="resolveLeave(true)"
        (cancelled)="resolveLeave(false)"
      />
    }
  `,
})
export class GameplayComponent {
  confirming = false;
  private leaveResolver?: (allowed: boolean) => void;

  constructor(
    readonly game: GameService,
    private router: Router,
  ) {}

  async act(action: Action): Promise<void> {
    if (this.game.act(action) && action.type === 'exit') await this.complete();
  }

  async complete(): Promise<void> {
    this.game.clear();
    await this.router.navigate(['/campaign']);
  }

  canLeave(): boolean | Promise<boolean> {
    const match = this.game.match();
    if (!match || match.phase === 'finished') {
      this.game.clear();
      return true;
    }
    this.confirming = true;
    return new Promise((resolve) => {
      this.leaveResolver = resolve;
    });
  }

  resolveLeave(allowed: boolean): void {
    this.confirming = false;
    if (allowed) {
      allowed = this.game.act({ type: 'exit' });
      if (allowed) this.game.clear();
    }
    this.leaveResolver?.(allowed);
    this.leaveResolver = undefined;
  }
}
