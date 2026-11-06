import { Injectable, signal } from '@angular/core';

type Sound = 'click' | 'card' | 'stop' | 'win' | 'lose' | 'draw';

@Injectable({ providedIn: 'root' })
export class SoundService {
  readonly enabled = signal(true);
  private context?: AudioContext;
  private unlocked = false;

  /** Called only by a user gesture, so there is no autoplay or queued surprise sound. */
  unlock(): void {
    this.unlocked = true;
    if (!this.enabled()) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    } catch {
      /* Audio support must not affect the game. */
    }
  }

  toggle(): void {
    this.enabled.update((value) => !value);
    if (this.enabled()) {
      this.unlock();
      this.play('click');
    } else if (this.context?.state === 'running') void this.context.suspend().catch(() => {});
  }

  play(sound: Sound): void {
    const ctx = this.context;
    if (!this.enabled() || !this.unlocked || !ctx || ctx.state !== 'running') return;
    try {
      const notes: Record<Sound, number[]> = {
        click: [520],
        card: [220, 340],
        stop: [420, 320],
        win: [523, 659, 784],
        lose: [330, 262],
        draw: [392, 392],
      };
      const duration = sound === 'click' ? 0.045 : sound === 'card' ? 0.055 : 0.11;
      notes[sound].forEach((frequency, index) => {
        const start = ctx.currentTime + index * duration;
        const oscillator = ctx.createOscillator(),
          volume = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        volume.gain.setValueAtTime(0, start);
        volume.gain.linearRampToValueAtTime(0.045, start + 0.008);
        volume.gain.exponentialRampToValueAtTime(0.001, start + duration);
        oscillator.connect(volume);
        volume.connect(ctx.destination);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.01);
        oscillator.onended = () => {
          oscillator.disconnect();
          volume.disconnect();
        };
      });
    } catch {
      /* Browsers can suspend audio when the tab is inactive. */
    }
  }
}
