import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm',
  standalone: true,
  template: `
    <div class="overlay">
      <section
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <span class="eyebrow">ПОДТВЕРЖДЕНИЕ</span>
        <h2 id="confirm-title">Вы уверены?</h2>
        <p>{{ message }}</p>
        <div class="button-row">
          <button
            class="button success"
            (click)="accepted.emit()"
          >
            Да
          </button>
          <button
            class="button danger"
            (click)="cancelled.emit()"
          >
            Нет
          </button>
        </div>
      </section>
    </div>
  `,
})
export class ConfirmComponent {
  @Input() message = 'Текущая игра будет завершена.';
  @Output() accepted = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
