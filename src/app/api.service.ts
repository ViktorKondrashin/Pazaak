import { Injectable, signal } from '@angular/core';
import { ApiSnapshot } from './core/api-models';
import { GameError } from './core/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  readonly state = signal<ApiSnapshot | null>(null);
  readonly connected = signal(false);
  private token: string | null = null;
  private initializing?: Promise<void>;
  private timer?: ReturnType<typeof setInterval>;
  private polling = false;
  private offset = 0;
  private generation = 0;

  constructor() {
    window.addEventListener('pagehide', (event) => {
      if (!event.persisted) this.closeSession();
    });
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) window.location.reload();
    });
  }

  get now(): number {
    return Date.now() + this.offset;
  }

  async ensureSession(): Promise<void> {
    if (this.token) return;
    if (this.initializing) return this.initializing;
    this.initializing = (async () => {
      const reply = await this.fetch('/api/session', 'POST', {});
      this.token = reply.token;
      this.state.set(null);
      this.apply(reply);
      this.timer ??= setInterval(() => {
        void this.refresh().catch(() => {});
      }, 750);
    })().finally(() => {
      this.initializing = undefined;
    });
    return this.initializing;
  }

  async post(operation: string, body: object = {}): Promise<void> {
    await this.ensureSession();
    try {
      this.apply(await this.fetch(`/api/${operation}`, 'POST', body));
    } catch (error) {
      if (error instanceof GameError && error.code !== 'AUTH') await this.refresh().catch(() => {});
      throw error;
    }
  }

  async refresh(): Promise<void> {
    if (!this.token || this.polling) return;
    this.polling = true;
    try {
      this.apply(await this.fetch('/api/state', 'GET'));
    } finally {
      this.polling = false;
    }
  }

  private apply(reply: ApiSnapshot): void {
    this.offset = reply.serverTime - Date.now();
    if (!this.state() || reply.revision >= this.state()!.revision) this.state.set(reply);
    this.connected.set(true);
  }

  private async fetch(url: string, method: string, body?: object): Promise<any> {
    const generation = this.generation;
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, {
        method,
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const reply = await response.json();
      if (generation !== this.generation)
        throw new GameError('SESSION_CLOSED', 'Сетевой сеанс завершён');
      if (!response.ok) {
        if (response.status === 401) {
          this.token = null;
          this.connected.set(false);
          clearInterval(this.timer);
          this.timer = undefined;
        }
        throw new GameError(reply.code || 'HTTP', reply.message || 'Сервер отклонил запрос');
      }
      return reply;
    } catch (error) {
      if (error instanceof GameError) throw error;
      if (generation === this.generation) this.connected.set(false);
      throw new GameError('CONNECTION', 'Нет соединения с сервером. Проверьте подключение');
    } finally {
      clearTimeout(timer);
    }
  }

  closeSession(): void {
    this.generation++;
    if (this.token)
      void fetch('/api/session/close', {
        method: 'POST',
        credentials: 'omit',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
        body: '{}',
      }).catch(() => {});
    this.token = null;
    this.state.set(null);
    this.connected.set(false);
    clearInterval(this.timer);
    this.timer = undefined;
  }
}
