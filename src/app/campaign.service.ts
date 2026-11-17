import { Injectable, signal } from '@angular/core';
import { BrowserSaveService } from './browser-save.service';
import { awardCampaign, isUnlocked, newCampaign } from './core/campaign';
import { PLANETS } from './core/catalog';
import { MatchState } from './core/models';
import { campaignFromSave, validSelectedCards } from './core/saved-progress';

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private readonly progress = signal(newCampaign());
  readonly state = this.progress.asReadonly();
  readonly planets = PLANETS;
  readonly selectedPlanet = signal(1);
  readonly selectedCards = signal<string[]>([]);

  constructor(private readonly saves: BrowserSaveService = new BrowserSaveService()) {
    const saved = saves.load();
    this.progress.set(campaignFromSave(saved));
    this.selectedPlanet.set(saved.selectedPlanet);
    this.selectedCards.set(saved.selectedCards);
  }

  recordResult(match: MatchState, humanUid: string): void {
    const previous = this.progress();
    const next = awardCampaign(previous, match, humanUid);
    if (next === previous) return;
    this.progress.set(next);
    this.selectedPlanet.set(Math.min(next.completed.length + 1, this.planets.length));
    this.saves.update({ completed: next.completed.length, selectedPlanet: this.selectedPlanet() });
  }

  unlocked(id: number): boolean {
    return isUnlocked(this.state(), id);
  }

  selectPlanet(id: number): void {
    if (this.unlocked(id)) {
      this.selectedPlanet.set(id);
      this.saves.update({ selectedPlanet: id });
    }
  }

  selectCards(ids: string[]): void {
    if (validSelectedCards(ids, this.state())) {
      this.selectedCards.set([...ids]);
      this.saves.update({ selectedCards: ids });
    }
  }
}
