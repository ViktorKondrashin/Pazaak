import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { RuleComponent } from './rule/rule.component';
import { GameComponent } from './game/game.component';
import { GameplayComponent } from './gameplay/gameplay.component';
import { CampaignMapComponent } from './campaign-map/campaign-map.component';
import { PvpLobbyComponent } from './pvp-lobby/pvp-lobby.component';
import { PvpGameComponent } from './pvp-game/pvp-game.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'rule', component: RuleComponent },
  { path: 'game', component: GameComponent },
  { path: 'gameplay', component: GameplayComponent },
  { path: 'campaign', component: CampaignMapComponent },
  { path: 'pvp-lobby', component: PvpLobbyComponent },
  { path: 'pvp-game/:id', component: PvpGameComponent }
];