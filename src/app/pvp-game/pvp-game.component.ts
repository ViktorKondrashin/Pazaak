import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PvpService } from '../pvp.service';

@Component({
  selector: 'app-pvp-game',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="background:#1a472a; min-height:100vh; color:white; padding:20px; text-align:center">
      <h2>PvP Матч</h2>
      <div style="display:flex; justify-content:center; gap:40px; flex-wrap:wrap">
        <div style="background:#00000080; padding:20px; border-radius:24px; min-width:200px">
          <h3>Вы</h3>
          <div>Сумма: <strong>{{ mySum }}</strong> {{ mySum>20? '🔥':'' }}</div>
          <div>Победы: {{ myWins }}</div>
          <div *ngIf="myStand">🛑 Стоп</div>
        </div>
        <div style="background:#00000080; padding:20px; border-radius:24px; min-width:200px">
          <h3>Противник</h3>
          <div>Сумма: <strong>{{ oppSum }}</strong></div>
          <div>Победы: {{ oppWins }}</div>
          <div *ngIf="oppStand">🛑 Стоп</div>
        </div>
      </div>
      <div class="turn-indicator" *ngIf="!finished">
        <p *ngIf="myTurn && !myStand" style="font-size:24px">⭐ Ваш ход! ⭐</p>
        <p *ngIf="!myTurn && !finished && !oppStand" style="font-size:24px">⏳ Ход противника...</p>
        <p *ngIf="myStand && !oppStand && !finished" style="font-size:24px">✅ Вы остановились. Ждём противника.</p>
        <p *ngIf="oppStand && !myStand && !finished" style="font-size:24px">✅ Противник остановился. Ваш ход.</p>
      </div>
      <div class="actions" *ngIf="!finished">
        <button *ngIf="myTurn && !myStand" (click)="addRandomCard()" style="margin:5px; padding:10px">🎴 Взять карту</button>
        <button *ngIf="myTurn && !myStand" (click)="stand()" style="margin:5px; padding:10px">🛑 Стоп</button>
        <button (click)="surrender()" style="margin-top:20px; background:#8b3c3c">🏳️ Сдаться</button>
      </div>
      <div *ngIf="finished">
        <h2>{{ resultText }}</h2>
        <button routerLink="/">🏠 Главное меню</button>
      </div>
    </div>
  `,
  styles: []
})
export class PvpGameComponent implements OnInit, OnDestroy {
  roomId = '';
  myRole: 'player1' | 'player2' = 'player1';
  mySum = 0;
  oppSum = 0;
  myWins = 0;
  oppWins = 0;
  myStand = false;
  oppStand = false;
  myTurn = false;
  finished = false;
  resultText = '';
  private unsubscribe: any;

  constructor(
    private route: ActivatedRoute,
    private pvp: PvpService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.roomId = this.route.snapshot.paramMap.get('id')!;
    console.log('=== PvP Game init, roomId =', this.roomId);
    this.initRole();
    this.unsubscribe = this.pvp.listenRoom(this.roomId, (data) => {
      if (data) this.syncState(data);
    });
  }

  private initRole() {
    const saved = localStorage.getItem(`pvp_role_${this.roomId}`);
    console.log('Роль из localStorage:', saved);
    this.myRole = (saved === 'player1' || saved === 'player2') ? saved : 'player1';
    console.log('Моя роль:', this.myRole);
  }

  private async syncState(data: any) {
    if (!data) return;
    const p1 = data.players?.player1;
    const p2 = data.players?.player2;
    if (this.myRole === 'player1') {
      this.mySum = p1?.sum ?? 0;
      this.myWins = p1?.wins ?? 0;
      this.myStand = p1?.isStand ?? false;
      this.oppSum = p2?.sum ?? 0;
      this.oppWins = p2?.wins ?? 0;
      this.oppStand = p2?.isStand ?? false;
    } else {
      this.mySum = p2?.sum ?? 0;
      this.myWins = p2?.wins ?? 0;
      this.myStand = p2?.isStand ?? false;
      this.oppSum = p1?.sum ?? 0;
      this.oppWins = p1?.wins ?? 0;
      this.oppStand = p1?.isStand ?? false;
    }
    this.myTurn = (data.currentTurn === this.myRole);
    console.log('syncState: myTurn =', this.myTurn, 'myStand =', this.myStand, 'oppStand =', this.oppStand);

    // Если оба игрока остановились – завершаем раунд
    if ((this.myStand && this.oppStand) && data.status === 'playing' && !this.finished) {
      console.log('Оба остановились -> определяем победителя раунда');
      await this.determineRoundWinner();
    }

    if (data.status === 'finished' && !this.finished) {
      this.finished = true;
      this.resultText = data.winner === this.myRole ? '🏆 ПОБЕДА!' : '💀 ПОРАЖЕНИЕ...';
    }
  }

  private async determineRoundWinner() {
    const myVal = this.mySum <= 20 ? this.mySum : -1;
    const oppVal = this.oppSum <= 20 ? this.oppSum : -1;
    let winner: 'player1' | 'player2' | null = null;
    if (myVal > oppVal) winner = this.myRole;
    else if (oppVal > myVal) winner = this.myRole === 'player1' ? 'player2' : 'player1';
    // ничья – winner = null

    const room = await this.pvp.getRoom(this.roomId);
    if (winner === null) {
      // Ничья – сброс раунда без изменения очков
      await this.pvp.updatePlayer(this.roomId, 'player1', { sum: 0, isStand: false });
      await this.pvp.updatePlayer(this.roomId, 'player2', { sum: 0, isStand: false });
      await this.pvp.setTurn(this.roomId, 'player1');
    } else {
      const currentWins = winner === 'player1' ? (room.players.player1.wins || 0) : (room.players.player2.wins || 0);
      const newWins = currentWins + 1;
      if (newWins >= 3) {
        await this.pvp.finishGame(this.roomId, winner);
      } else {
        await this.pvp.updatePlayer(this.roomId, winner, { sum: 0, isStand: false, wins: newWins });
        const loser = winner === 'player1' ? 'player2' : 'player1';
        await this.pvp.updatePlayer(this.roomId, loser, { sum: 0, isStand: false });
        await this.pvp.setTurn(this.roomId, 'player1');
      }
    }
  }

  async addRandomCard() {
    if (this.finished || this.myStand || !this.myTurn) return;
    const card = Math.floor(Math.random() * 10) + 1;
    let newSum = this.mySum + card;
    if (newSum > 20) newSum = 22;
    await this.pvp.updatePlayer(this.roomId, this.myRole, { sum: newSum });

    if (newSum > 20) {
      // автоматический стоп при переборе
      await this.stand();
    } else {
      // после взятия карты ход переходит к другому игроку (если он ещё не остановился)
      const next = this.myRole === 'player1' ? 'player2' : 'player1';
      const room = await this.pvp.getRoom(this.roomId);
      const nextStand = next === 'player1' ? room.players.player1.isStand : room.players.player2.isStand;
      if (!nextStand) {
        await this.pvp.setTurn(this.roomId, next);
      } else {
        // другой уже в стопе – значит, оба стоят (текущий ещё не в стопе, но сейчас он не в стопе, потому что мы только что взяли карту и не нажали стоп)
        // Однако после нашего хода, если другой уже в стопе, мы должны завершить раунд? Нет, потому что текущий игрок ещё не остановился. Ему нужно дать возможность остановиться.
        // Поэтому ход остаётся у текущего игрока. Он может дальше брать карты или нажать Стоп.
        // Таким образом, в этом случае ход не переключаем – пусть текущий продолжает.
        console.log('Другой игрок уже в стопе, ход остаётся у текущего');
      }
    }
  }

  async stand() {
    if (this.finished || this.myStand || !this.myTurn) return;
    await this.pvp.updatePlayer(this.roomId, this.myRole, { isStand: true });

    // После стопа ход переходит к другому, если он ещё не в стопе
    const next = this.myRole === 'player1' ? 'player2' : 'player1';
    const room = await this.pvp.getRoom(this.roomId);
    const nextStand = next === 'player1' ? room.players.player1.isStand : room.players.player2.isStand;
    if (!nextStand) {
      await this.pvp.setTurn(this.roomId, next);
    } else {
      // Если другой уже в стопе, то оба стоят – раунд завершится в syncState
      console.log('Оба игрока в стопе, раунд будет завершён');
      // Принудительно вызовем проверку обоих стопов, но syncState сам сработает по обновлению данных
    }
  }

  surrender() {
    if (confirm('Сдаться?')) {
      const winner = this.myRole === 'player1' ? 'player2' : 'player1';
      this.pvp.finishGame(this.roomId, winner);
    }
  }

  ngOnDestroy() {
    if (this.unsubscribe) this.unsubscribe();
  }
}