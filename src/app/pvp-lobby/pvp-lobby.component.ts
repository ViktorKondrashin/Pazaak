import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PvpService } from '../pvp.service';

@Component({
  selector: 'app-pvp-lobby',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pvp-lobby.component.html',
  styleUrls: ['./pvp-lobby.component.css']
})
export class PvpLobbyComponent implements OnDestroy {
  roomId: string = '';
  private unsubscribe: any;

  constructor(private pvp: PvpService, private router: Router) {}

  async createGame() {
    console.log('=== createGame нажат ===');
    try {
      this.roomId = await this.pvp.createRoom();
      console.log('Комната создана, ID =', this.roomId);
      // Фиксируем роль player1 для создателя
      localStorage.setItem(`pvp_role_${this.roomId}`, 'player1');
      this.unsubscribe = this.pvp.listenRoom(this.roomId, (data) => {
        console.log('Создатель: получены данные комнаты:', data);
        if (data?.status === 'playing' && data?.players?.player2) {
          console.log('Второй игрок подключился, создатель переходит в игру');
          this.router.navigate(['/pvp-game', this.roomId]);
        }
      });
    } catch (err) {
      console.error('Ошибка createGame:', err);
      alert('Не удалось создать комнату');
    }
  }

  async joinGame(roomId: string) {
    console.log('=== joinGame, roomId =', roomId);
    if (!roomId) return;
    const success = await this.pvp.joinRoom(roomId);
    console.log('Результат joinRoom:', success);
    if (success) {
      console.log('Успешно присоединились, второй игрок переходит в игру');
      // Фиксируем роль player2 для присоединившегося
      localStorage.setItem(`pvp_role_${roomId}`, 'player2');
      // Гарантированный переход через перезагрузку
      window.location.href = `/pvp-game/${roomId}`;
    } else {
      alert('Комната не найдена или уже занята');
    }
  }

  getInviteLink() {
    return `${window.location.origin}/pvp-lobby?join=${this.roomId}`;
  }

  copyLink() {
    navigator.clipboard.writeText(this.getInviteLink());
    alert('Ссылка скопирована');
  }

  ngOnDestroy() {
    if (this.unsubscribe) this.unsubscribe();
  }
}