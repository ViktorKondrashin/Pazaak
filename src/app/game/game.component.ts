// game.component.ts
import { Component } from '@angular/core';
import { Card } from '../card';
import { Router } from '@angular/router';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [NgIf],
  templateUrl: './game.component.html',
  styleUrl: './game.component.css'
})
export class GameComponent {
  CountOfCards = [3,3,2,3,3,2,3,2,2,1,2,2,1,3,1,1,3,2,1,1,-1,-1,-1,-1];
  TypeOfCards = ["p1","p2","p3","p4","p5","p6","-1","-2","-3","-4","-5","-6","p-1","p-2","p-3","p-4","p-5","p-6","2&4","3&6","","","",""];
  AvelCards: Card[] = [];
  ChosenCards: HTMLElement[] = [];
  PofDiv: HTMLElement[] = [];
  BlockAvelCards: any;
  CardsIsStacked: boolean;
  IsNotific: boolean = false;

  constructor(private router: Router) {
    this.CardsIsStacked = false;
    var Self = this;
    var left = 0;
    var top = 15;
    var index = 0.53;
    for(let i = 1; i < 25; i++) {
      this.AvelCards[i] = new Card();
      var htmle: HTMLElement = document.createElement("div");
      this.AvelCards[i].Htmle.style.backgroundColor = 'rgba(235, 227, 227, 1)';
      this.AvelCards[i].Htmle.style.height = '16vh';
      this.AvelCards[i].Htmle.style.width = '8vw';
      this.AvelCards[i].Htmle.style.position = 'absolute';
      this.AvelCards[i].Htmle.style.zIndex = '1';
      this.AvelCards[i].Htmle.style.borderRadius = '0.5cap';
      this.AvelCards[i].Htmle.style.boxShadow = '0 0 5px 0.5px rgb(153, 153, 153)';
      this.AvelCards[i].CountOfCards = this.CountOfCards[i-1];
      if (this.AvelCards[i].CountOfCards != -1) {
        this.AvelCards[i].Htmle.addEventListener('mouseenter', function() {
          if (!Self.IsNotific) {
            this.style.boxShadow = '0 0 10px 5px rgba(255, 72, 72, 1)';
            this.style.transition = 'box-shadow 0.08s ease-in-out';
            this.style.cursor = 'pointer';
          }
        });
        this.AvelCards[i].Htmle.addEventListener('mouseleave', function() {
          this.style.boxShadow = '0 0 5px 0.5px rgb(153, 153, 153)';
          this.style.transition = 'box-shadow 0.08s ease-in-out';
        });
        this.AvelCards[i].Htmle.addEventListener('click', function() {
          if (!Self.IsNotific) {
            if (Self.AvelCards[i].CountOfCards > 0 && Self.CountOfChosenCards() < 10) {
              Self.AvelCards[i].CountOfCards--;
              Self.PofDiv[i-1].textContent = Self.AvelCards[i].CountOfCards.toString();
              for (let j = 1; j < 11; j++) {
                if (!Self.ChosenCards[j].style.backgroundImage) {
                  sessionStorage.setItem(j.toString(), Self.AvelCards[i].TypeCard);
                  Self.ChosenCards[j].style.backgroundImage = "url('assets/cards/"+Self.AvelCards[i].TypeCard.toString()+".png')";
                  break;
                }
              }
            }
          }
        });
      }
      if (i==7 || i==13 || i==19) {
        top+=19;
        index = 0.53;
      }
      this.AvelCards[i].Htmle.style.left = (index+index*9).toString()+'vw';
      this.AvelCards[i].Htmle.style.top = top.toString()+'vh';
      index++;
      this.AvelCards[i].Htmle.style.backgroundPosition = 'center center';
      this.AvelCards[i].Htmle.style.backgroundRepeat = 'no-repeat';
      this.AvelCards[i].Htmle.style.backgroundSize = 'cover';
    }
    left = 3.5;
    top = 2.2;
    for (let i = 1; i < 11; i++) {
      var htmle: HTMLElement = document.createElement("div");
      htmle.style.backgroundColor = 'rgb(255, 246, 246)';
      htmle.style.height = '16vh';
      htmle.style.width = '8vw';
      htmle.style.position = 'absolute';
      htmle.style.zIndex = '1';
      htmle.style.borderRadius = '0.5cap';
      htmle.style.boxShadow = '0 0 1px 0.2px rgb(153, 153, 153)';
      htmle.style.backgroundPosition = 'center center';
      htmle.style.backgroundRepeat = 'no-repeat';
      htmle.style.backgroundSize = 'cover';
      htmle.id = i.toString();
      this.ChosenCards[i] = htmle;
      htmle.style.top = top.toString()+'vh';
      htmle.style.left = left.toString()+'vw';
      left+=10;
      if (i%2==0) {
        top+=18;
        left = 3.5;
      }
    }
    for(let i = 0; i < 24; i++) {
      if (this.CountOfCards[i] != -1) {
        var p: HTMLElement = document.createElement("p");
        p.style.color = 'rgba(255, 255, 255, 1)';
        p.style.position = 'absolute';
        p.style.bottom = '0vh';
        p.style.right = '1vw';
        p.style.fontSize = '1.8vh';
        p.textContent = this.CountOfCards[i].toString();
        this.AvelCards[i+1].TypeCard = this.TypeOfCards[i];
        this.AvelCards[i+1].Htmle.id = this.TypeOfCards[i];
        this.AvelCards[i+1].Htmle.style.backgroundImage = "url('assets/cards/"+this.AvelCards[i+1].TypeCard.toString()+".png')";
        this.PofDiv[i] = p;
        this.AvelCards[i+1].Htmle.append(this.PofDiv[i]);
      }
    }
  }

  ngAfterViewInit() {
    for (let i = 1; i < 11; i++) {
      document.getElementById('BlockChosenCards')?.append(this.ChosenCards[i]);
    }
    for(var i = 1; i < 25; i++) {
      document.getElementById('blockofAvelCards')?.append(this.AvelCards[i].Htmle);
    }
  }

  SetOfCards() {
    if(!this.IsNotific) {
      if (this.CountOfChosenCards() != 10) {
        let confirmWindow = document.getElementById('AlertWindow');
        confirmWindow!.style.zIndex = "2";
        this.IsNotific = true;
      } else {
        let confirmWindow = document.getElementById('ConfirmWindow');
        confirmWindow!.style.zIndex = "2";
        this.IsNotific = true;
      }
    }
  }

  AlertWindowOk() {
    let confirmWindow = document.getElementById('AlertWindow');
    confirmWindow!.style.zIndex = "0";
    this.IsNotific = false;
  }

  ConfirmWindowOk() {
    this.CardsIsStacked = true;
    this.router.navigate(["gameplay"]);
    this.IsNotific = false;
  }

  ConfirmWindowCancel() {
    window.location.reload();
    this.IsNotific = false;
  }

  CountOfChosenCards() {
    var count = 0;
    for (let i = 1; i < 11; i++) {
      if (this.ChosenCards[i].style.backgroundImage) {
        count++;
      }
    }
    return count;
  }

  IsCardsIsStacked() {
    return this.CardsIsStacked;
  }

  ResetChosenCards() {
    if (!this.IsNotific) {
      this.CountOfCards = [3,3,2,3,3,2,3,2,2,1,2,2,1,3,1,1,3,2,-1,-1,-1,1,1,-1];
      let temp = [3,3,2,3,3,2,3,2,2,1,2,2,1,3,1,1,3,2,1,1];
      for (let i=1;i<11;i++) {
        document.getElementById((i).toString())!.style.backgroundImage = "";
      }
      for (let i=0;i<temp.length;i++) {
        if (temp[i]!=-1) {
          document.getElementById('blockofAvelCards')!.getElementsByTagName("p")![i].textContent = temp[i].toString();
        }
      }
      for(let i=1;i<25;i++) {
        this.AvelCards[i].CountOfCards = this.CountOfCards[i-1];
      }
      sessionStorage.clear();
    }
  }

  Return() {
    if (!this.IsNotific) {
      this.router.navigate(["/"]);
    }
  }
}