import { Component, computed, inject } from '@angular/core';
import { CampaignService } from '../campaign.service';
import { compareCards } from '../core/catalog';
import { Card } from '../core/models';
import { CardComponent } from './card.component';

@Component({
  selector: 'app-collection',
  standalone: true,
  imports: [CardComponent],
  template: `
    <button
      type="button"
      class="pill collection-trigger"
      aria-haspopup="dialog"
      [attr.aria-label]="'Посмотреть коллекцию: ' + countLabel()"
      (click)="collectionDialog.showModal()"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <rect x="8" y="5" width="12" height="16" rx="2" />
        <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />
        <path d="M12 13h4m-2-2v4" />
      </svg>
      <span>{{ countLabel() }}</span>
      <span class="collection-trigger-arrow" aria-hidden="true">↗</span>
    </button>

    <dialog
      #collectionDialog
      class="modal collection-modal"
      aria-modal="true"
      aria-labelledby="collection-title"
      aria-describedby="collection-description"
      (click)="closeOnBackdrop($event)"
    >
      <button
        type="button"
        class="modal-close"
        aria-label="Закрыть коллекцию"
        autofocus
        (click)="collectionDialog.close()"
      >
        ×
      </button>
      <span class="eyebrow">ВАША КОЛЛЕКЦИЯ · {{ countLabel() }}</span>
      <h2 id="collection-title">Мои карты</h2>
      <p id="collection-description">
        Начальные карты и награды за одиночную игру. Для матча с ботом или по сети
        вы выбираете 10 карт из этой коллекции.
      </p>
      <div class="collection-preview-grid" role="list" aria-label="Карты в коллекции">
        @for (group of groups(); track group.card.typeId) {
          <div
            class="collection-preview-item"
            role="listitem"
            [attr.aria-label]="'Карта ' + group.card.typeId + ', количество: ' + group.count"
          >
            <app-card [card]="group.card" />
            <span class="collection-copy-count">× {{ group.count }}</span>
          </div>
        }
      </div>
      <p class="collection-note">Коллекция сохраняется до обновления или закрытия страницы.</p>
    </dialog>
  `,
})
export class CollectionComponent {
  private readonly campaign = inject(CampaignService);

  readonly countLabel = computed(() => {
    const count = this.campaign.state().collection.length;
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    let noun = 'карт';
    if (lastTwoDigits < 11 || lastTwoDigits > 14) {
      if (lastDigit === 1) noun = 'карта';
      else if (lastDigit >= 2 && lastDigit <= 4) noun = 'карты';
    }
    return `${count} ${noun}`;
  });

  readonly groups = computed(() => {
    const groups = new Map<string, { card: Card; count: number }>();
    for (const card of this.campaign.state().collection) {
      const group = groups.get(card.typeId);
      if (group) group.count++;
      else groups.set(card.typeId, { card, count: 1 });
    }
    return [...groups.values()].sort((a, b) => compareCards(a.card, b.card));
  });

  closeOnBackdrop(event: MouseEvent): void {
    const dialog = event.currentTarget as HTMLDialogElement;
    if (event.target !== dialog) return;

    const bounds = dialog.getBoundingClientRect();
    const outside =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;
    if (outside) dialog.close();
  }
}
