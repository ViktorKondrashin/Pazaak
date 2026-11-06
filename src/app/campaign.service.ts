import { Injectable, signal } from '@angular/core';
import { awardCampaign, isUnlocked, newCampaign } from './core/campaign';
import { PLANETS } from './core/catalog';
import { MatchState } from './core/models';

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private readonly progress = signal(newCampaign());
  readonly state = this.progress.asReadonly();
  readonly planets = PLANETS;
  readonly selectedPlanet = signal(1);
  readonly selectedCards = signal<string[]>([]);

  recordResult(match: MatchState, humanUid: string): void {
    const previous = this.progress();
    const next = awardCampaign(previous, match, humanUid);
    if (next === previous) return;
    this.progress.set(next);
    this.selectedPlanet.set(Math.min(next.completed.length + 1, this.planets.length));
  }

  unlocked(id: number): boolean {
    return isUnlocked(this.state(), id);
  }

  selectPlanet(id: number): void {
    if (this.unlocked(id)) this.selectedPlanet.set(id);
  }

  selectCards(ids: string[]): void {
    this.selectedCards.set(ids);
  }
}
