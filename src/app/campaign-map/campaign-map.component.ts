import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CampaignService } from '../campaign.service';
import { GameService } from '../game.service';
import { REWARDS } from '../core/catalog';
import { CollectionComponent } from '../shared/collection.component';

@Component({
  selector: 'app-campaign-map',
  standalone: true,
  imports: [RouterLink, CollectionComponent],
  template: `
    <main class="page campaign-page">
      <header class="page-header">
        <div>
          <span class="eyebrow">PURE PAZAAK · ОДИНОЧНАЯ ИГРА</span>
          <h1>
            Выбор уровня
            <span class="muted">(бот)</span>
          </h1>
          <p class="muted">Побеждайте, открывайте планеты и пополняйте свою коллекцию.</p>
        </div>
        <div class="page-header-actions">
          <app-collection />
          <span class="eyebrow campaign-progress">
            КАМПАНИЯ · {{ campaign.state().completed.length }} / 5
          </span>
        </div>
      </header>
      <div class="planet-grid">
        @for (planet of campaign.planets; track planet.id) {
          <button
            class="planet-tile"
            [class.selected]="campaign.selectedPlanet() === planet.id"
            [class.locked]="!campaign.unlocked(planet.id)"
            [disabled]="!campaign.unlocked(planet.id)"
            (click)="campaign.selectPlanet(planet.id)"
          >
            <span class="eyebrow">ПЛАНЕТА 0{{ planet.id }}</span>
            <div
              class="planet-art"
              [style.--planet-color]="planet.color"
            >
              <div class="planet-sphere"></div>
              <div class="orbit"></div>
            </div>
            <h2>{{ planet.name }}</h2>
            <p>{{ planet.subtitle }}</p>
            <span class="planet-status">
              {{
                !campaign.unlocked(planet.id)
                  ? '🔒 Закрыта'
                  : campaign.state().completed.includes(planet.id)
                    ? '✓ Пройдена'
                    : 'Доступна'
              }}
            </span>
          </button>
        }
      </div>
      <section class="panel planet-detail">
        <div>
          <span class="eyebrow">НАГРАДА ЗА ПЕРВУЮ ПОБЕДУ</span>
          <h2>{{ campaign.planets[campaign.selectedPlanet() - 1].name }}</h2>
          <div class="reward-chips">
            @for (type of rewards[campaign.selectedPlanet() - 1]; track $index) {
              <span>{{ type }}</span>
            }
          </div>
          <p class="muted">
            {{
              campaign.state().completed.includes(campaign.selectedPlanet())
                ? 'Награда уже получена. Планету можно пройти повторно.'
                : 'Победите в трёх сетах, чтобы пройти планету.'
            }}
          </p>
        </div>
        <button
          class="button success"
          (click)="play()"
        >
          Играть на планете →
        </button>
      </section>
      @if (game.error()) {
        <p
          class="error"
          role="alert"
        >
          {{ game.error() }}
        </p>
      }
      @if (campaign.state().completed.length === 5) {
        <p class="campaign-complete">Кампания пройдена! Все 41 карта доступны для новых матчей.</p>
      }
      <footer class="page-footer">
        <a
          class="button subtle"
          routerLink="/"
        >
          ← Назад
        </a>
        <p class="muted">Прогресс действует до обновления или закрытия страницы.</p>
      </footer>
    </main>
  `,
})
export class CampaignMapComponent {
  readonly rewards = REWARDS;

  constructor(
    readonly campaign: CampaignService,
    readonly game: GameService,
    private router: Router,
  ) {}

  async play(): Promise<void> {
    if (this.game.prepare(this.campaign.selectedPlanet())) await this.router.navigate(['/game']);
  }
}
