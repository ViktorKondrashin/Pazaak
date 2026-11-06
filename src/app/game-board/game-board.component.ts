import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { Action, Card } from '../core/models';
import { MatchView, PlayerView } from '../core/api-models';
import { CardComponent } from '../shared/card.component';
import { ConfirmComponent } from '../shared/confirm.component';
import { compareCards } from '../core/catalog';
import { SoundService } from '../sound.service';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CardComponent, ConfirmComponent],
  templateUrl: './game-board.component.html',
})
export class GameBoardComponent implements OnChanges, OnDestroy, AfterViewChecked {
  constructor(private sound: SoundService) {}
  @ViewChild('endTurnButton') private endTurnButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('resultDialog') private resultDialog?: ElementRef<HTMLElement>;
  @ViewChild('resultButton') private resultButton?: ElementRef<HTMLButtonElement>;
  @Input({ required: true }) match!: MatchView;
  @Input({ required: true }) uid!: string;
  @Input() connected = true;
  @Input() busy = false;
  @Input() error = '';
  @Output() action = new EventEmitter<Action>();
  @Output() complete = new EventEmitter<void>();
  @Output() offlineExit = new EventEmitter<void>();
  readonly slots = Array.from({ length: 9 }, (_, i) => i);
  readonly wins = [0, 1, 2];
  decision: 'surrender' | 'exit' | null = null;
  // Keep input and the result dialog clear while the new card becomes visible.
  dealing = false;
  private visibleCards = new Set<string>();
  private dealTimer?: ReturnType<typeof setTimeout>;
  private stoppedPlayers = new Set<string>();
  private resultKey = '';

  ngOnChanges(): void {
    if (!this.match) return;
    const cards = new Set(
      this.match.players.flatMap((player) =>
        player.board.map(
          (card) =>
            `${this.match.matchId}:${this.match.setNumber}:${player.uid}:${card.instanceId}`,
        ),
      ),
    );
    const added = [...cards].some((key) => !this.visibleCards.has(key));
    this.visibleCards = cards;
    const stopped = new Set(
      this.match.players
        .filter((player) => player.stopped)
        .map((player) => `${this.match.matchId}:${this.match.setNumber}:${player.uid}`),
    );
    if ([...stopped].some((key) => !this.stoppedPlayers.has(key))) this.sound.play('stop');
    this.stoppedPlayers = stopped;
    if (added) {
      this.sound.play('card');
      clearTimeout(this.dealTimer);
      this.dealing = true;
      // Matches the 320 ms card-appear animation in styles.css.
      this.dealTimer = setTimeout(() => {
        this.dealing = false;
        this.playResultSound();
      }, 320);
    }
    if (!this.dealing) this.playResultSound();
  }

  private playResultSound(): void {
    if (this.match.phase === 'playing' || this.match.phase === 'interrupted') return;
    const key = `${this.match.matchId}:${this.match.setNumber}:${this.match.phase}`;
    if (key === this.resultKey) return;
    this.resultKey = key;
    const winner = this.match.phase === 'finished' ? this.match.winner : this.match.result?.winner;
    this.sound.play(winner == null ? 'draw' : winner === this.uid ? 'win' : 'lose');
  }

  ngAfterViewChecked(): void {
    this.alignResult();
  }

  @HostListener('window:resize')
  alignResult(): void {
    const anchor = this.endTurnButton?.nativeElement,
      dialog = this.resultDialog?.nativeElement,
      button = this.resultButton?.nativeElement;
    if (!anchor || !dialog || !button) return;
    const target = anchor.getBoundingClientRect(),
      box = dialog.getBoundingClientRect(),
      action = button.getBoundingClientRect();
    const viewport = window.visualViewport;
    const height = viewport?.height ?? window.innerHeight,
      width = viewport?.width ?? window.innerWidth;
    const top = Math.max(
      16,
      Math.min(
        height - box.height - 16,
        target.top + target.height / 2 - (action.top - box.top) - action.height / 2,
      ),
    );
    const left = Math.max(
      16,
      Math.min(width - box.width - 16, target.left + target.width / 2 - box.width / 2),
    );
    dialog.style.top = `${top}px`;
    dialog.style.left = `${left}px`;
  }

  ngOnDestroy(): void {
    clearTimeout(this.dealTimer);
  }

  get sortedHand(): Card[] {
    return [...this.self.hand].sort(compareCards);
  }

  get canPlayCard(): boolean {
    return this.canAct && !this.match.handCardPlayed;
  }

  get opponentName(): string {
    return this.match.mode === 'campaign' ? 'Бот' : 'Соперник';
  }

  get turnLabel(): string {
    if (this.match.phase !== 'playing') return 'Сет завершён';
    if (this.self.stopped)
      return `Вы остановились · ход ${this.match.mode === 'campaign' ? 'бота' : 'соперника'}`;
    if (this.opponent.stopped) return `${this.opponentName} остановился · ваш ход`;
    return this.match.currentPlayer === this.uid
      ? 'Ваш ход'
      : `Ход ${this.match.mode === 'campaign' ? 'бота' : 'соперника'}`;
  }

  get controlHelp(): string {
    if (this.self.stopped) return 'Вы остановились. Соперник продолжает набор.';
    if (this.match.currentPlayer !== this.uid) return 'Дождитесь хода соперника.';
    if (this.match.handCardPlayed) return 'Карта сыграна. Выберите «Завершить ход» или «Стоп».';
    if (this.self.score > 20) return 'Перебор можно исправить одной картой руки.';
    return 'Можно сыграть одну карту руки, затем завершить ход или нажать «Стоп».';
  }

  get self(): PlayerView {
    return this.match.players.find((p) => p.uid === this.uid)!;
  }

  get opponent(): PlayerView {
    return this.match.players.find((p) => p.uid !== this.uid)!;
  }

  get canAct(): boolean {
    return (
      this.connected &&
      !this.busy &&
      !this.dealing &&
      this.match.phase === 'playing' &&
      this.match.currentPlayer === this.uid &&
      !this.self.stopped
    );
  }

  get heading(): string {
    if (this.match.phase === 'interrupted') return 'Игрок вышел';
    if (this.match.phase === 'finished') {
      if (this.match.winner !== this.uid) return 'Вы проиграли матч';
      return this.match.finishReason === 'surrender' || this.match.finishReason === 'exit'
        ? 'Вы победили, соперник сдался'
        : 'Вы победили!';
    }
    return this.match.result?.winner === null
      ? 'Ничья в сете'
      : this.match.result?.winner === this.uid
        ? 'Вы выиграли сет!'
        : 'Вы проиграли сет';
  }

  play(card: Card, sign?: 1 | -1): void {
    if (this.canPlayCard)
      this.action.emit(
        sign === undefined
          ? { type: 'play', instanceId: card.instanceId }
          : { type: 'play', instanceId: card.instanceId, sign },
      );
  }

  confirm(): void {
    const type = this.decision;
    this.decision = null;
    if (type && this.connected && !this.busy) this.action.emit({ type });
  }
}
