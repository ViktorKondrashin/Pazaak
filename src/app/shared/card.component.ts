import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Card } from '../core/models';
import { cardLabel } from '../core/catalog';

@Component({
  selector: 'app-card',
  standalone: true,
  template: `
    <div
      class="playing-card"
      [class]="'playing-card kind-' + card.kind"
      [class.disabled-card]="disabled && interactive"
      [title]="description"
      [attr.data-instance]="card.instanceId"
      [attr.data-type]="card.typeId"
      [attr.data-kind]="card.kind"
      [attr.data-value]="card.value"
      [attr.data-signed]="signedValue"
    >
      <span class="card-corner">{{ label }}</span>
      @if (interactive && card.kind === 'dual') {
        <button
          class="card-half positive-half"
          [disabled]="disabled"
          (click)="choose.emit(1)"
          [attr.aria-label]="'Сыграть +' + card.value"
        >
          +{{ card.value }}
        </button>
        <button
          class="card-half negative-half"
          [disabled]="disabled"
          (click)="choose.emit(-1)"
          [attr.aria-label]="'Сыграть −' + card.value"
        >
          −{{ card.value }}
        </button>
      } @else if (interactive) {
        <button
          class="card-face"
          [disabled]="disabled"
          (click)="choose.emit(undefined)"
          [attr.aria-label]="'Сыграть ' + label"
        >
          {{ label }}
        </button>
      } @else {
        <span class="card-value">{{ label }}</span>
      }
      <span class="card-mark">
        {{
          card.kind === 'main' ? 'PAZAAK' : card.kind.startsWith('flip') ? 'ПЕРЕВОРОТ' : 'PAZAAK'
        }}
      </span>
    </div>
  `,
})
export class CardComponent {
  @Input({ required: true }) card!: Card;
  @Input() signedValue?: number;
  @Input() interactive = false;
  @Input() disabled = false;
  @Output() choose = new EventEmitter<1 | -1 | undefined>();

  get label(): string {
    if (this.signedValue !== undefined && !this.card.kind.startsWith('flip'))
      return this.signedValue < 0
        ? `−${-this.signedValue}`
        : this.card.kind === 'main'
          ? `${this.signedValue}`
          : `+${this.signedValue}`;
    return cardLabel(this.card);
  }

  get description(): string {
    if (this.card.kind.startsWith('flip'))
      return `${this.label}: меняет знак своих карт с этими номиналами; занимает слот и даёт 0 очков`;
    return this.card.kind === 'dual'
      ? 'Верхняя половина: плюс. Нижняя половина: минус'
      : this.label;
  }
}
