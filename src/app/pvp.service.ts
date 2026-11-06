import { computed, Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { commandFor } from './core/game-engine';
import { Action, GameError } from './core/models';
import { emptyLobby } from './core/lobby';

@Injectable({ providedIn: 'root' })
export class PvpService {
  readonly session = computed(() => this.api.state()?.session ?? null);
  readonly lobby = computed(() => this.api.state()?.lobby ?? emptyLobby());
  readonly room = computed(() => this.api.state()?.room ?? null);
  readonly connected = computed(() => this.api.connected());
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = computed(() => this.api.state()?.notice ?? '');

  constructor(private readonly api: ApiService) {}

  get now(): number {
    return this.api.now;
  }

  invitation() {
    const id = this.session()?.invitationId;
    return id ? (this.lobby().invitations[id] ?? null) : null;
  }

  async connect(): Promise<void> {
    await this.perform(() => this.api.post('lobby/connect'));
  }

  async invite(publicId: string): Promise<void> {
    if (!/^[0-9]{8}$/.test(publicId)) {
      this.error.set('Неправильный формат ID');
      return;
    }
    await this.perform(() => this.api.post('lobby/invite', { publicId }));
  }

  async respond(response: 'accept' | 'decline' | 'cancel'): Promise<void> {
    const invitationId = this.invitation()?.id;
    if (invitationId)
      await this.perform(() => this.api.post('lobby/respond', { invitationId, response }));
  }

  async ready(ids: string[]): Promise<void> {
    await this.perform(() => this.api.post('room/ready', { roomId: this.room()?.id, ids }));
  }

  async sendFallback(roomId: string, ids: string[]): Promise<void> {
    await this.perform(() => this.api.post('room/fallback', { roomId, ids }));
  }

  async act(action: Action): Promise<void> {
    const match = this.room()?.match,
      uid = this.session()?.uid;
    if (!match || !uid) return;
    const command = commandFor(match, uid, action);
    await this.perform(async () => {
      try {
        await this.api.post('room/command', { roomId: command.roomId, command });
      } catch (error) {
        const latest = this.room()?.match;
        if (
          !(error instanceof GameError) ||
          error.code !== 'VERSION' ||
          action.type !== 'ack' ||
          latest?.phase !== 'setResult' ||
          latest.setNumber !== command.setNumber
        )
          throw error;
        if (!latest.acknowledgements.includes(uid))
          await this.api.post('room/command', {
            roomId: command.roomId,
            command: { ...command, expectedVersion: latest.version },
          });
      }
    });
  }

  async cancelPreparation(): Promise<boolean> {
    const ok = await this.perform(() => this.api.post('room/cancel', { roomId: this.room()?.id }));
    return ok ? this.finishViewing() : false;
  }

  async cancelAccepted(): Promise<void> {
    await this.perform(() => this.api.post('room/cancel', { roomId: this.room()?.id }));
  }

  async finishViewing(): Promise<boolean> {
    if (!this.room()) return true;
    return this.perform(() => this.api.post('room/finish', { roomId: this.room()?.id }));
  }

  async leaveLobby(): Promise<boolean> {
    if (!this.connected()) {
      await this.abandonOffline();
      return true;
    }
    const invitation = this.invitation();
    if (invitation?.status === 'pending')
      await this.respond(invitation.fromUid === this.session()?.uid ? 'cancel' : 'decline');
    if (this.invitation()?.status === 'pending' || this.room()) return false;
    const left = await this.perform(() => this.api.post('lobby/leave'));
    if (left) this.api.closeSession();
    return left;
  }

  async abandonOffline(): Promise<void> {
    this.api.closeSession();
  }

  private async perform(work: () => Promise<void>): Promise<boolean> {
    if (this.busy()) return false;
    this.busy.set(true);
    this.error.set('');
    try {
      await work();
      return true;
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Ошибка соединения');
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}
