import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';   // ← добавили RouterLink
import { CampaignService, Planet } from '../campaign.service';

@Component({
  selector: 'app-campaign-map',
  standalone: true,
  imports: [CommonModule, RouterLink],   // ← добавили RouterLink в imports
  templateUrl: './campaign-map.component.html',
  styleUrls: ['./campaign-map.component.css']
})
export class CampaignMapComponent implements OnInit {
  planets: Planet[] = [];
  crystals: number = 0;

  constructor(private campaignService: CampaignService, private router: Router) {}

  ngOnInit() {
    this.planets = this.campaignService.getPlanets();
    this.crystals = this.campaignService.getCrystals();
  }

  selectPlanet(planet: Planet) {
    if (!planet.isUnlocked || planet.isBeaten) return;
    sessionStorage.setItem('campaignMode', 'true');
    sessionStorage.setItem('currentPlanetId', planet.id.toString());
    this.router.navigate(['/game']);
  }
}