import { Component, effect, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PvpService } from '../pvp.service';

@Component({
  selector: 'app-pvp-lobby',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="page lobby-page">
      <header class="page-header">
        <div>
          <span class="eyebrow">PURE PAZAAK · СЕТЕВАЯ ИГРА</span>
          <h1>Поиск игрока</h1>
        </div>
        <span
          class="connection"
          [class.online]="pvp.connected()"
          ><i></i>{{ pvp.connected() ? 'В сети' : 'Нет соединения' }}</span
        >
      </header>
      <div class="lobby-layout">
        <section class="panel identity-panel">
          <span class="eyebrow">ВАШ ID ИГРОКА</span>
          <div class="public-id">{{ pvp.session()?.publicId ?? '••••••••' }}</div>
          <p>Передайте этот ID сопернику.<br />Он сможет пригласить вас в матч.</p>
          <div
            class="id-decoration"
            aria-hidden="true"
          >
            ✦
          </div>
        </section>
        <section class="panel invite-panel">
          <span class="eyebrow">ПРИГЛАСИТЬ ДРУГА</span>
          <h2>Один на один</h2>
          <p class="muted">Попросите друга открыть сетевую игру и введите его ID.</p>
          <label for="opponent-id">ID соперника</label
          ><input
            id="opponent-id"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            placeholder="00000000"
            [(ngModel)]="targetId"
            [disabled]="pvp.busy() || !!pvp.invitation()"
            (keydown.enter)="$event.preventDefault()"
            aria-describedby="lobby-error"
          />
          @if (pvp.error()) {
            <p
              id="lobby-error"
              class="error"
              role="alert"
            >
              {{ pvp.error() }}
            </p>
          }
          @if (pvp.notice()) {
            <p
              class="notice"
              role="status"
            >
              {{ pvp.notice() }}
            </p>
          }
          <button
            class="button primary"
            [disabled]="pvp.busy() || !pvp.connected() || !!pvp.invitation()"
            (click)="pvp.invite(targetId)"
          >
            Отправить приглашение →
          </button>
          @if (!pvp.connected()) {
            <button
              class="button subtle"
              [disabled]="connecting"
              (click)="connect()"
            >
              {{ connecting ? 'Подключение…' : 'Повторить подключение' }}
            </button>
          }
        </section>
      </div>
      <footer class="page-footer">
        <button
          class="button subtle"
          [disabled]="pvp.busy()"
          (click)="back()"
        >
          ← Назад
        </button>
        <p class="muted">
          ID действует в текущем сеансе. Приглашение можно отменить в любой момент.
        </p>
      </footer>
      @if (pvp.invitation(); as invitation) {
        <div class="overlay">
          <section
            class="modal"
            role="dialog"
            aria-modal="true"
          >
            @if (invitation.status === 'pending' && invitation.toUid === pvp.session()?.uid) {
              <button
                class="modal-close"
                aria-label="Отклонить и закрыть"
                [disabled]="pvp.busy()"
                (click)="pvp.respond('decline')"
              >
                ×</button
              ><span class="eyebrow">ВХОДЯЩЕЕ ПРИГЛАШЕНИЕ</span>
              <h2>Сыграем в Pazaak?</h2>
              <p>
                Игрок <b>{{ pvp.lobby().players[invitation.fromUid].publicId }}</b> приглашает вас в
                матч.
              </p>
              <div class="button-row">
                <button
                  class="button success"
                  [disabled]="pvp.busy() || !pvp.connected()"
                  (click)="pvp.respond('accept')"
                >
                  Принять</button
                ><button
                  class="button danger"
                  [disabled]="pvp.busy() || !pvp.connected()"
                  (click)="pvp.respond('decline')"
                >
                  Отказаться
                </button>
              </div>
            } @else {
              <span class="eyebrow">ПОИСК ИГРОКА</span>
              <h2>
                {{ invitation.status === 'accepted' ? 'Готовим матч…' : 'Приглашение отправлено' }}
              </h2>
              <p>
                Ожидаем
                {{
                  invitation.status === 'accepted'
                    ? 'подключения обоих игроков'
                    : 'ответа соперника'
                }}.
              </p>
              <div class="waiting-time">{{ elapsed }} с</div>
              @if (invitation.status === 'pending') {
                <button
                  class="button subtle"
                  [disabled]="pvp.busy() || !pvp.connected()"
                  (click)="pvp.respond('cancel')"
                >
                  Отменить приглашение
                </button>
              }
              @if (invitation.status === 'accepted') {
                <button
                  class="button subtle"
                  [disabled]="pvp.busy() || !pvp.connected()"
                  (click)="pvp.cancelAccepted()"
                >
                  Отменить подготовку
                </button>
              }
            }
            @if (pvp.error()) {
              <p
                class="error"
                role="alert"
              >
                {{ pvp.error() }}
              </p>
            }
            @if (!pvp.connected()) {
              <button
                class="text-button"
                (click)="back()"
              >
                Вернуться в меню
              </button>
            }
          </section>
        </div>
      }
    </main>
  `,
})
export class PvpLobbyComponent implements OnInit, OnDestroy {
  targetId = '';
  elapsed = 0;
  connecting = false;
  private enteringRoom = false;
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    readonly pvp: PvpService,
    private router: Router,
  ) {
    effect(() => {
      const room = this.pvp.room();
      if (room) {
        this.enteringRoom = true;
        void this.router.navigate(['/pvp-game', room.id]);
      }
    });
  }

  ngOnInit(): void {
    void this.connect();
    this.timer = setInterval(() => {
      this.elapsed = Math.max(
        0,
        Math.floor((this.pvp.now - (this.pvp.invitation()?.createdAt ?? this.pvp.now)) / 1000),
      );
    }, 500);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  async connect(): Promise<void> {
    this.connecting = true;
    try {
      await this.pvp.connect();
    } catch {
      /* The service provides the message. */
    } finally {
      this.connecting = false;
    }
  }

  back(): void {
    void this.router.navigate(['/']);
  }

  canLeave(): boolean | Promise<boolean> {
    return this.enteringRoom || this.pvp.leaveLobby();
  }
}
