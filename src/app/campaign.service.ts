// src/app/campaign.service.ts
import { Injectable } from '@angular/core';

export interface Planet {
  id: number;
  name: string;
  isUnlocked: boolean;
  isBeaten: boolean;
  requiredCrystals?: number; // для будущих планет, которые можно открыть за кристаллы
}

@Injectable({
  providedIn: 'root'
})
export class CampaignService {
  private planets: Planet[] = [];
  private crystals: number = 0;
  private storageKey = 'pazaak_campaign';

  constructor() {
    this.loadFromStorage();
    if (this.planets.length === 0) {
      this.initCampaign();
    }
  }

  private initCampaign() {
    // Создаём 15 планет. Первая открыта и не пройдена.
    for (let i = 1; i <= 15; i++) {
      this.planets.push({
        id: i,
        name: `Планета ${i}`,
        isUnlocked: i === 1,
        isBeaten: false
      });
    }
    this.crystals = 0;
    this.saveToStorage();
  }

  private loadFromStorage() {
    const data = localStorage.getItem(this.storageKey);
    if (data) {
      const parsed = JSON.parse(data);
      this.planets = parsed.planets;
      this.crystals = parsed.crystals;
    }
  }

  private saveToStorage() {
    localStorage.setItem(this.storageKey, JSON.stringify({
      planets: this.planets,
      crystals: this.crystals
    }));
  }

  getPlanets(): Planet[] {
    return this.planets;
  }

  getCrystals(): number {
    return this.crystals;
  }

  // Получить текущую активную планету (первую непройденную, но открытую)
  getCurrentPlanet(): Planet | null {
    for (let p of this.planets) {
      if (p.isUnlocked && !p.isBeaten) return p;
    }
    return null;
  }

  // Вызывается после победы над планетой
  beatPlanet(planetId: number): boolean {
    const planet = this.planets.find(p => p.id === planetId);
    if (planet && !planet.isBeaten) {
      planet.isBeaten = true;
      // Открываем следующую планету (если есть)
      const nextPlanet = this.planets.find(p => p.id === planetId + 1);
      if (nextPlanet) {
        nextPlanet.isUnlocked = true;
      }
      // Начисляем кристаллы
      this.crystals += 100;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Сброс прогресса (для тестирования)
  resetCampaign() {
    localStorage.removeItem(this.storageKey);
    this.initCampaign();
  }
}