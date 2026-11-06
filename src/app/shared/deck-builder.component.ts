import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Card } from '../core/models';
import { compareCards } from '../core/catalog';
import { CardComponent } from './card.component';

@Component({
  selector: 'app-deck-builder',
  standalone: true,
  imports: [CardComponent],
  template: `
    <main class="page deck-page">
      <header class="page-header">
        <div>
          <span class="eyebrow">{{ modeLabel }}</span>
          <h1>Подготовка к матчу</h1>
        </div>
        <div
          class="timer"
          [class.urgent]="seconds <= 10"
        >
          <span>ВРЕМЯ НА ВЫБОР</span>{{ time }}
        </div>
      </header>
      @if (error) {
        <p
          class="error"
          role="alert"
        >
          {{ error }}
        </p>
      }
      <div class="deck-layout">
        <section class="panel collection-panel">
          <div class="section-heading">
            <h2>Доступные карты</h2>
            <span class="pill">{{ collection.length }} в коллекции</span>
          </div>
          <p class="muted">Нажмите на карту, чтобы добавить её в боковую колоду.</p>
          <div class="collection-grid">
            @for (group of groups; track group.card.typeId) {
              <button
                class="collection-item"
                [disabled]="locked || selected.length === 10 || group.remaining === 0"
                (click)="add(group.card.typeId)"
                [attr.aria-label]="'Добавить ' + group.card.typeId"
                [attr.data-card-type]="group.card.typeId"
              >
                <app-card [card]="group.card" /><span class="quantity"
                  >{{ group.remaining }} / {{ group.total }}</span
                >
              </button>
            }
          </div>
        </section>
        <section class="panel selected-panel">
          <div class="section-heading">
            <h2>Наберите боковую колоду</h2>
            <span
              class="pill"
              [class.complete]="selected.length === 10"
              >{{ selected.length }} / 10</span
            >
          </div>
          <p class="muted">Нажмите на выбранную карту, чтобы вернуть её.</p>
          <div class="selected-grid">
            @for (slot of slots; track slot) {
              @if (selectedCard(slot); as card) {
                <button
                  class="selected-item"
                  [disabled]="locked"
                  (click)="remove(card.instanceId)"
                  [attr.aria-label]="'Убрать ' + card.typeId"
                >
                  <app-card [card]="card" />
                </button>
              } @else {
                <div class="empty-card">
                  <span>{{ slot + 1 }}</span>
                </div>
              }
            }
          </div>
          <p class="selection-hint">
            {{
              waiting
                ? 'Колода готова. Ожидаем соперника…'
                : 'В начале каждого сета вы получите 4 карты из этих 10.'
            }}
          </p>
          <div class="button-row">
            <button
              class="button subtle"
              [disabled]="locked || !selected.length"
              (click)="selectionChange.emit([])"
            >
              Сбросить</button
            ><button
              class="button success"
              [disabled]="locked || selected.length !== 10"
              (click)="start.emit()"
            >
              {{ waiting ? 'Ожидание…' : 'Играть' }}
            </button>
          </div>
        </section>
      </div>
      <footer class="page-footer">
        <button
          class="button subtle"
          (click)="back.emit()"
        >
          ← Назад
        </button>
        <p class="muted">
          Когда время закончится, незавершённый выбор заменится случайной колодой.
        </p>
      </footer>
    </main>
  `,
})
export class DeckBuilderComponent {
  @Input() collection: Card[] = [];
  @Input() selected: string[] = [];
  @Input() seconds = 60;
  @Input() locked = false;
  @Input() waiting = false;
  @Input() modeLabel = 'КАМПАНИЯ';
  @Input() error = '';
  @Output() selectionChange = new EventEmitter<string[]>();
  @Output() start = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
  readonly slots = Array.from({ length: 10 }, (_, i) => i);

  get time(): string {
    return `${Math.floor(this.seconds / 60)
      .toString()
      .padStart(2, '0')}:${(this.seconds % 60).toString().padStart(2, '0')}`;
  }

  get groups(): { card: Card; total: number; remaining: number }[] {
    const map = new Map<string, { card: Card; total: number; remaining: number }>();
    for (const card of this.collection) {
      if (!map.has(card.typeId)) map.set(card.typeId, { card, total: 0, remaining: 0 });
      const group = map.get(card.typeId)!;
      group.total++;
      if (!this.selected.includes(card.instanceId)) group.remaining++;
    }
    return [...map.values()].sort((a, b) => compareCards(a.card, b.card));
  }

  selectedCard(slot: number): Card | undefined {
    return this.collection.filter((c) => this.selected.includes(c.instanceId)).sort(compareCards)[
      slot
    ];
  }

  add(typeId: string): void {
    if (this.locked || this.selected.length >= 10) return;
    const card = this.collection.find(
      (c) => c.typeId === typeId && !this.selected.includes(c.instanceId),
    );
    if (card) this.selectionChange.emit([...this.selected, card.instanceId]);
  }

  remove(id: string): void {
    if (!this.locked) this.selectionChange.emit(this.selected.filter((value) => value !== id));
  }
}
