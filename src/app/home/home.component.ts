import { Component } from '@angular/core';
import { RuleComponent } from '../rule/rule.component';
import { RouterOutlet, RouterLink} from "@angular/router";
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RuleComponent,RouterOutlet, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  constructor()
  {
    document.body.style.backgroundColor ='#000000ff';

  }
}
