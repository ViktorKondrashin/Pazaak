import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { HomeComponent } from './app/home/home.component';
import { RuleComponent } from './app/rule/rule.component';
import { GameComponent } from './app/game/game.component';
import { GameplayComponent } from './app/gameplay/gameplay.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
bootstrapApplication(HomeComponent, appConfig)
  .catch((err) => console.error(err));
  bootstrapApplication(RuleComponent, appConfig)
  .catch((err) => console.error(err));
    bootstrapApplication(GameComponent, appConfig)
  .catch((err) => console.error(err));
      bootstrapApplication(GameplayComponent, appConfig)
  .catch((err) => console.error(err));