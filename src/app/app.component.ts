import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {HomeComponent} from './home/home.component'
import {RuleComponent} from './rule/rule.component'
import { GameComponent } from './game/game.component';
import { GameplayComponent } from './gameplay/gameplay.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,HomeComponent,RuleComponent,GameComponent,GameplayComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'pazaak';
}
