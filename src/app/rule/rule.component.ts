import { Component } from '@angular/core';
import { RouterOutlet, RouterLink} from "@angular/router";
@Component({
  selector: 'app-rule',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './rule.component.html',
  styleUrl: './rule.component.css'
})
export class RuleComponent {
  constructor()
  {
    
  }
}
