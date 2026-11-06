import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Routes, Router } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { RuleComponent } from './rule/rule.component';
import { GameComponent } from './game/game.component';
import { GameplayComponent } from './gameplay/gameplay.component';
import { CampaignMapComponent } from './campaign-map/campaign-map.component';
import { PvpLobbyComponent } from './pvp-lobby/pvp-lobby.component';
import { PvpGameComponent } from './pvp-game/pvp-game.component';
import { GameService } from './game.service';
import { PvpService } from './pvp.service';

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'home', redirectTo: '', pathMatch: 'full' },
  { path: 'rule', component: RuleComponent },
  { path: 'campaign', component: CampaignMapComponent },
  {
    path: 'game',
    component: GameComponent,
    canActivate: [() => !!inject(GameService).preparing() || inject(Router).createUrlTree(['/'])],
    canDeactivate: [(c: GameComponent) => c.canLeave()],
  },
  {
    path: 'gameplay',
    component: GameplayComponent,
    canActivate: [() => !!inject(GameService).match() || inject(Router).createUrlTree(['/'])],
    canDeactivate: [(c: GameplayComponent) => c.canLeave()],
  },
  {
    path: 'pvp-lobby',
    component: PvpLobbyComponent,
    canDeactivate: [(c: PvpLobbyComponent) => c.canLeave()],
  },
  {
    path: 'pvp-game/:id',
    component: PvpGameComponent,
    canActivate: [
      (route: ActivatedRouteSnapshot) =>
        inject(PvpService).room()?.id === route.paramMap.get('id') ||
        inject(Router).createUrlTree(['/']),
    ],
    canDeactivate: [(c: PvpGameComponent) => c.canLeave()],
  },
  { path: '**', redirectTo: '' },
];
