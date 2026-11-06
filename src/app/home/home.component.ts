import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CampaignService } from '../campaign.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="home-page">
      <header class="home-top"><span class="brand-small">КАРТОЧНАЯ ИГРА</span></header>
      <section class="home-hero">
        <div class="logo-frame">
          <span>PURE</span>
          <h1>PAZAAK</h1>
        </div>
        <p>Подойдите к двадцати. Остановитесь вовремя.</p>
      </section>
      <nav
        class="mode-grid"
        aria-label="Режимы игры"
      >
        <a
          class="mode-card campaign-mode"
          routerLink="/campaign"
          ><svg
            viewBox="0 0 64 64"
            aria-hidden="true"
          >
            <rect
              x="11"
              y="20"
              width="42"
              height="32"
              rx="10"
            />
            <path d="M32 20V9M5 32v12M59 32v12M23 43h18" />
            <circle
              cx="23"
              cy="32"
              r="2"
            />
            <circle
              cx="41"
              cy="32"
              r="2"
            /></svg
          ><span class="eyebrow">ПЯТЬ ПЛАНЕТ · НОВЫЕ КАРТЫ</span>
          <h2>Играть <br />с ботом</h2>
          <span class="mode-link">Начать кампанию <b>↗</b></span></a
        >
        <a
          class="mode-card online-mode"
          routerLink="/pvp-lobby"
          ><svg
            viewBox="0 0 64 64"
            aria-hidden="true"
          >
            <circle
              cx="32"
              cy="32"
              r="24"
            />
            <ellipse
              cx="32"
              cy="32"
              rx="10"
              ry="24"
            />
            <path d="M8 32h48M13 17h38M13 47h38" /></svg
          ><span class="eyebrow">ПРИГЛАШЕНИЕ ПО ID</span>
          <h2>Играть <br />по сети</h2>
          <span class="mode-link">Вызвать соперника <b>↗</b></span></a
        >
        <a
          class="mode-card rules-mode"
          routerLink="/rule"
          ><svg
            viewBox="0 0 64 64"
            aria-hidden="true"
          >
            <rect
              x="14"
              y="7"
              width="36"
              height="50"
              rx="6"
            />
            <path d="M23 21h18M23 31h18M23 41h11" /></svg
          ><span class="eyebrow">ОСНОВЫ И ОСОБЫЕ КАРТЫ</span>
          <h2>Правила <br />игры</h2>
          <span class="mode-link">Разобраться в игре <b>↗</b></span></a
        >
      </nav>
      <footer class="home-footer">
        <span
          >В коллекции <b>{{ campaign.state().collection.length }}</b> карт · Пройдено
          <b>{{ campaign.state().completed.length }} / 5</b> планет</span
        ><span>Прогресс действует до обновления страницы</span>
      </footer>
    </main>
  `,
})
export class HomeComponent {
  constructor(readonly campaign: CampaignService) {}
}
