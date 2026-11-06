import { Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SoundService } from './sound.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div
      class="ambient"
      aria-hidden="true"
    ></div>
    <button
      class="sound-toggle"
      [attr.aria-pressed]="sound.enabled()"
      [attr.aria-label]="sound.enabled() ? 'Выключить звук' : 'Включить звук'"
      [title]="sound.enabled() ? 'Выключить звук' : 'Включить звук'"
      (click)="sound.toggle()"
    >
      {{ sound.enabled() ? '♫' : '♪' }}
      <span>{{ sound.enabled() ? 'Звук вкл.' : 'Звук выкл.' }}</span>
    </button>
    <router-outlet />
  `,
})
export class AppComponent {
  constructor(readonly sound: SoundService) {}

  @HostListener('document:pointerdown')
  unlockAudio(): void {
    this.sound.unlock();
  }

  @HostListener('document:click', ['$event'])
  clickSound(event: MouseEvent): void {
    const button = (event.target as Element)?.closest('button, a');
    if (!button || button.matches(':disabled, .sound-toggle, .card-face, .card-half')) return;
    this.sound.play('click');
  }

  @HostListener('document:keydown', ['$event'])
  preventKeyboardActions(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
    if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
  }
}
