import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { Bot } from '../bot';
import { Router } from '@angular/router';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CampaignService } from '../campaign.service';

@Component({
  selector: 'app-gameplay',
  standalone: true,
  imports: [NgIf, RouterOutlet, RouterLink],
  templateUrl: './gameplay.component.html',
  styleUrl: './gameplay.component.css'
})
export class GameplayComponent {
  IssuedCardsType: string[] = [];
  SystemChosenCards: HTMLElement[] = [];
  UserChosenCards: HTMLElement[] = [];
  CountUserWins: number = 0;
  CountSystemWins: number = 0;
  SumOfUserCards: number = 0;
  SumOfSystemCards: number = 0;
  UserCardsField: HTMLElement[] = [];
  SystemCardsField: HTMLElement[] = [];
  IsPlayerCardsTurnOver: boolean = false;
  IsResultDisplaying: boolean = false;
  IsPlayerTurn: boolean = true;
  IsPlayerStand: boolean = false;
  IsSystemStand: boolean = false;
  IsCardChosen: boolean = false;
  Bot: Bot = new Bot();

  // Для кампании
  private isCampaignMode: boolean = false;
  private currentPlanetId: number = 0;

  constructor(private router: Router, private campaignService?: CampaignService) {
    // Загружаем выбранные карты из sessionStorage
    for (let i = 0; i < 10; i++) {
      this.IssuedCardsType[i] = sessionStorage.getItem((i + 1).toString()) ?? '0';
    }

    // Проверяем, кампания ли это
    if (sessionStorage.getItem('campaignMode') === 'true') {
      this.isCampaignMode = true;
      const pid = sessionStorage.getItem('currentPlanetId');
      this.currentPlanetId = pid ? parseInt(pid, 10) : 0;
    }

    var Self = this;
    let leftU = 0.25;
    let topU = 3;
    let leftS = 0.25;
    let topS = 3;
    let indx = 0;
    for (let i = 0; i < 9; i++) {
      this.UserCardsField[i] = document.createElement("div");
      this.SystemCardsField[i] = document.createElement("div");

      this.UserCardsField[i].style.backgroundPosition = 'center center';
      this.UserCardsField[i].style.backgroundRepeat = 'no-repeat';
      this.UserCardsField[i].style.backgroundSize = 'cover';
      this.UserCardsField[i].style.backgroundColor = 'rgba(235, 227, 227, 1)';
      this.UserCardsField[i].style.height = '16vh';
      this.UserCardsField[i].style.width = '8vw';
      this.UserCardsField[i].style.position = 'absolute';
      this.UserCardsField[i].style.zIndex = '1';
      this.UserCardsField[i].style.borderRadius = '0.5cap';
      this.UserCardsField[i].style.boxShadow = '0 0 5px 0.5px rgb(153, 153, 153)';
      if (i == 3 || i == 6) {
        topU += 19;
        leftU = 0.25;
      }
      this.UserCardsField[i].style.left = (leftU + leftU * 9).toString() + 'vw';
      this.UserCardsField[i].style.top = topU.toString() + 'vh';
      leftU++;

      this.SystemCardsField[i].style.backgroundPosition = 'center center';
      this.SystemCardsField[i].style.backgroundRepeat = 'no-repeat';
      this.SystemCardsField[i].style.backgroundSize = 'cover';
      this.SystemCardsField[i].style.backgroundColor = 'rgba(235, 227, 227, 1)';
      this.SystemCardsField[i].style.height = '16vh';
      this.SystemCardsField[i].style.width = '8vw';
      this.SystemCardsField[i].style.position = 'absolute';
      this.SystemCardsField[i].style.zIndex = '1';
      this.SystemCardsField[i].style.borderRadius = '0.5cap';
      this.SystemCardsField[i].style.boxShadow = '0 0 5px 0.5px rgb(153, 153, 153)';
      if (i == 3 || i == 6) {
        topS += 19;
        leftS = 0.25;
      }
      this.SystemCardsField[i].style.left = (leftS + leftS * 9).toString() + 'vw';
      this.SystemCardsField[i].style.top = topS.toString() + 'vh';
      leftS++;
    }

    leftU = 5.2;
    topU = 78;
    leftS = 58.4;
    topS = 78;
    for (let i = 0; i < 4; i++) {
      this.UserChosenCards[i] = document.createElement("div");
      this.SystemChosenCards[i] = document.createElement("div");

      this.UserChosenCards[i].style.backgroundPosition = 'center center';
      this.UserChosenCards[i].style.backgroundRepeat = 'no-repeat';
      this.UserChosenCards[i].style.backgroundSize = 'cover';
      this.UserChosenCards[i].style.backgroundColor = 'rgba(235, 227, 227, 1)';
      this.UserChosenCards[i].style.height = '16vh';
      this.UserChosenCards[i].style.width = '8vw';
      this.UserChosenCards[i].style.position = 'absolute';
      this.UserChosenCards[i].style.zIndex = '1';
      this.UserChosenCards[i].style.borderRadius = '0.5cap';
      this.UserChosenCards[i].style.boxShadow = '0 0 5px 0.5px rgb(153, 153, 153)';
      this.UserChosenCards[i].style.left = (leftU).toString() + 'vw';
      this.UserChosenCards[i].style.top = topU.toString() + 'vh';
      indx = Math.floor(Math.random() * (this.IssuedCardsType.length));
      this.UserChosenCards[i].id = this.IssuedCardsType[indx];
      this.UserChosenCards[i].style.backgroundImage = "url('assets/cards/" + this.UserChosenCards[i].id.toString() + ".png')";
      this.IssuedCardsType.splice(indx, 1);

      this.UserChosenCards[i].addEventListener('mousemove', function (e) {
        if (this.style.backgroundImage && !Self.IsResultDisplaying && Self.IsPlayerTurn && !Self.IsCardChosen) {
          if (this.id[0] == 'p' && this.id.length == 2) {
            this.style.boxShadow = '0 0 10px 5px rgba(97, 86, 253, 1)';
          } else if (this.id[0] == '-' && this.id.length == 2) {
            this.style.boxShadow = '0 0 10px 5px rgba(253, 78, 78, 1)';
          } else if (this.id.length == 3 && (this.id[0] == '2' || this.id[0] == '3')) {
            this.style.boxShadow = '0 0 10px 5px rgba(255, 235, 138, 1)';
          } else {
            if (e.pageY - this.offsetTop <= this.offsetHeight / 2) {
              this.style.boxShadow = '0 0 10px 5px rgba(97, 86, 253, 1)';
            } else {
              this.style.boxShadow = '0 0 10px 5px rgba(253, 78, 78, 1)';
            }
          }
          this.style.transition = 'box-shadow 0.15s ease-in-out';
          this.style.cursor = 'pointer';
        }
      });
      this.UserChosenCards[i].addEventListener('mouseleave', function () {
        this.style.cursor = "default";
        this.style.boxShadow = '0 0 5px 0.5px rgb(153, 153, 153)';
        this.style.transition = 'box-shadow 0.08s ease-in-out';
      });
      this.UserChosenCards[i].addEventListener('click', function (e) {
        if (this.style.backgroundImage && !Self.IsResultDisplaying && Self.IsPlayerTurn && !Self.IsCardChosen) {
          if (Self.CountOfPlayerFildCards() < 9) {
            Self.IsCardChosen = true;
            for (let j = 1; j < 9; j++) {
              if (!Self.UserCardsField[j].style.backgroundImage) {
                if (this.id[0] == 'p' && this.id[1] == '-') {
                  let y = e.pageY - this.offsetTop;
                  if (y <= this.offsetHeight / 2) {
                    Self.UserCardsField[j].id = Self.UserChosenCards[i].id;
                    Self.UserCardsField[j].style.backgroundImage = "url('assets/cards/" + this.id[0] + this.id[2] + ".png')";
                    Self.ChangeUserSum(this.id[0] + this.id[2]);
                  } else {
                    Self.UserCardsField[j].id = Self.UserChosenCards[i].id;
                    Self.UserCardsField[j].style.backgroundImage = "url('assets/cards/" + this.id[1] + this.id[2] + ".png')";
                    Self.ChangeUserSum(this.id[1] + this.id[2]);
                  }
                } else if (this.id.length == 2) {
                  Self.UserCardsField[j].id = Self.UserChosenCards[i].id;
                  Self.UserCardsField[j].style.backgroundImage = "url('assets/cards/" + Self.UserChosenCards[i].id.toString() + ".png')";
                  Self.ChangeUserSum(this.id);
                } else if (this.id[1] == '&') {
                  Self.UserCardsField[j].id = Self.UserChosenCards[i].id;
                  Self.UserCardsField[j].style.backgroundImage = "url('assets/cards/" + Self.UserChosenCards[i].id.toString() + ".png')";
                  Self.TurnOverPlayerCards(this.id);
                }
                this.style.backgroundImage = "";
                this.style.cursor = 'default';
                this.style.boxShadow = '0 0 5px 0.5px rgb(153, 153, 153)';
                this.style.transition = 'box-shadow 0.08s ease-in-out';
                break;
              }
            }
          }
        }
      });

      leftU += 9.46;

      this.SystemChosenCards[i].style.backgroundPosition = 'center center';
      this.SystemChosenCards[i].style.backgroundRepeat = 'no-repeat';
      this.SystemChosenCards[i].style.backgroundSize = 'cover';
      this.SystemChosenCards[i].style.backgroundColor = 'rgba(235, 227, 227, 1)';
      this.SystemChosenCards[i].style.height = '16vh';
      this.SystemChosenCards[i].style.width = '8vw';
      this.SystemChosenCards[i].style.position = 'absolute';
      this.SystemChosenCards[i].style.zIndex = '1';
      this.SystemChosenCards[i].style.borderRadius = '0.5cap';
      this.SystemChosenCards[i].style.boxShadow = '0 0 5px 0.5px rgb(153, 153, 153)';
      this.SystemChosenCards[i].style.left = (leftS).toString() + 'vw';
      this.SystemChosenCards[i].style.top = topS.toString() + 'vh';
      this.SystemChosenCards[i].style.backgroundImage = "url('assets/cards/blue_card.png')";
      leftS += 9.43;
    }

    let randCard = Math.floor(Math.random() * 10 + 1);
    this.UserCardsField[0].id = randCard.toString();
    this.UserCardsField[0].style.backgroundImage = "url('assets/cards/" + this.UserCardsField[0].id.toString() + ".png')";
    this.SumOfUserCards += randCard;
    window.onload = () => {
      for (let i = 0; i < 4; i++) {
        document.getElementById('UserChosenCards')?.append(this.UserChosenCards[i]);
        document.getElementById('SystemChosenCards')?.append(this.SystemChosenCards[i]);
      }
      for (let i = 0; i < 9; i++) {
        document.getElementById('BlockOfPlayerField')?.append(this.UserCardsField[i]);
        document.getElementById('BlockOfSystemField')?.append(this.SystemCardsField[i]);
      }
    }
  }

  ngAfterViewInit() {
    for (let i = 0; i < 4; i++) {
      document.getElementById('UserChosenCards')?.append(this.UserChosenCards[i]);
      document.getElementById('SystemChosenCards')?.append(this.SystemChosenCards[i]);
    }
    for (let i = 0; i < 9; i++) {
      document.getElementById('BlockOfPlayerField')?.append(this.UserCardsField[i]);
      document.getElementById('BlockOfSystemField')?.append(this.SystemCardsField[i]);
    }
  }

  // ========================  ОСНОВНЫЕ МЕТОДЫ ========================

  Surrender() {
    if (!this.IsResultDisplaying && this.IsPlayerTurn) {
      this.IsResultDisplaying = true;
      let confirmWindow = document.getElementById('ConfirmWindow');
      if (confirmWindow) confirmWindow.style.zIndex = "2";
    }
  }

  EndTurn() {
    if (!this.IsResultDisplaying && this.IsPlayerTurn) {
      if (this.CountOfPlayerFildCards() < 8 && this.CountOfSystemFildCards() < 8) {
        if (this.SumOfUserCards > 20 && this.SumOfSystemCards > 20) {
          this.NewRaund(0);
          return;
        } else if (this.SumOfUserCards > 20) {
          this.NewRaund(1);
          return;
        } else if (this.SumOfSystemCards > 20) {
          this.NewRaund(-1);
          return;
        }
        this.IsCardChosen = false;

        if (!this.IsSystemStand && !this.IsPlayerStand) {
          this.ChangeTurn();
          let AvelPlaceIndx = this.GetIndxOfLastAvelItem(this.SystemCardsField);
          let randCard = Math.floor(Math.random() * 10 + 1);
          randCard = Math.floor(Math.random() * 10 + 1);
          this.SystemCardsField[AvelPlaceIndx].id = randCard.toString();
          this.SystemCardsField[AvelPlaceIndx].style.backgroundImage = "url('assets/cards/" + this.SystemCardsField[AvelPlaceIndx].id.toString() + ".png')";
          this.SumOfSystemCards += randCard;
          this.Bot.Thinking(this.SumOfUserCards, this.SumOfSystemCards);
          setTimeout(() => {
            this.UseBotAnswer();
            randCard = Math.floor(Math.random() * 10 + 1);
            AvelPlaceIndx = this.GetIndxOfLastAvelItem(this.UserCardsField);
            this.UserCardsField[AvelPlaceIndx].id = randCard.toString();
            this.UserCardsField[AvelPlaceIndx].style.backgroundImage = "url('assets/cards/" + this.UserCardsField[AvelPlaceIndx].id.toString() + ".png')";
            this.SumOfUserCards += randCard;
          }, 1000);
        } else if (this.IsSystemStand) {
          let AvelPlaceIndx = this.GetIndxOfLastAvelItem(this.UserCardsField);
          let randCard = Math.floor(Math.random() * 10 + 1);
          this.UserCardsField[AvelPlaceIndx].id = randCard.toString();
          this.UserCardsField[AvelPlaceIndx].style.backgroundImage = "url('assets/cards/" + this.UserCardsField[AvelPlaceIndx].id.toString() + ".png')";
          this.SumOfUserCards += randCard;
        }
      } else {
        this.Stand();
      }
    }
  }

  Stand() {
    this.IsPlayerStand = true;
    if (!this.IsResultDisplaying && this.IsPlayerTurn && this.IsSystemStand) {
      this.DetermineWinnerAndNewRound();
    } else if (!this.IsSystemStand) {
      this.ChangeTurn();
      let intr = setInterval(() => {
        if (this.IsResultDisplaying || this.IsSystemStand) {
          clearInterval(intr);
          if (this.IsSystemStand) {
            this.DetermineWinnerAndNewRound();
          }
          return;
        }
        let AvelPlaceIndx = this.GetIndxOfLastAvelItem(this.SystemCardsField);
        let randCard = Math.floor(Math.random() * 10 + 1);
        randCard = Math.floor(Math.random() * 10 + 1);
        this.SystemCardsField[AvelPlaceIndx].id = randCard.toString();
        this.SystemCardsField[AvelPlaceIndx].style.backgroundImage = "url('assets/cards/" + this.SystemCardsField[AvelPlaceIndx].id.toString() + ".png')";
        this.SumOfSystemCards += randCard;
        this.Bot.Thinking(this.SumOfUserCards, this.SumOfSystemCards);
        this.UseBotAnswer();
        if (this.CountOfSystemFildCards() < 8) {
          if (this.SumOfUserCards > 20 && this.SumOfSystemCards > 20) {
            this.NewRaund(0);
            return;
          } else if (this.SumOfUserCards > 20) {
            this.NewRaund(1);
            return;
          } else if (this.SumOfSystemCards > 20) {
            this.NewRaund(-1);
            return;
          }
        } else {
          this.IsSystemStand = true;
          this.Stand();
        }
      }, 500);
    }
    this.CorrectIndicators();
  }

  private DetermineWinnerAndNewRound() {
    if ((this.SumOfUserCards > 20 && this.SumOfSystemCards > 20) || this.SumOfUserCards == this.SumOfSystemCards) {
      this.NewRaund(0);
    } else if (this.SumOfUserCards > 20) {
      this.NewRaund(1);
    } else if (this.SumOfSystemCards > 20) {
      this.NewRaund(-1);
    } else if (this.SumOfUserCards > this.SumOfSystemCards) {
      this.NewRaund(-1);
    } else if (this.SumOfSystemCards > this.SumOfUserCards) {
      this.NewRaund(1);
    }
    if (this.CountUserWins == 3) {
      this.EndGame();
      return;
    } else if (this.CountSystemWins == 3) {
      this.EndGame();
      return;
    }
  }

  NewRaund(result: number) //0 - ничья, -1 - игрок выиграл, 1 - система
  {
    let div = document.getElementById('ResultOf');
    if (result == 0) {
      if (div?.getElementsByTagName("p")[0]) {
        div.getElementsByTagName("p")[0].textContent = "Ничья!";
        div.style.backgroundColor = "rgba(199, 119, 27, 0.5)";
        div.style.boxShadow = "0 0 5px 1px rgba(148, 87, 72, 1)";
        this.IsResultDisplaying = true;
        div.getElementsByTagName("button")[0].style.cursor = "pointer";
        div.style.opacity = "1";
      }
    } else if (result == 1) {
      this.CountSystemWins++;
      if (this.CountSystemWins == 3) {
        this.EndGame();
        return;
      }
      if (div?.getElementsByTagName("p")[0]) {
        div.getElementsByTagName("p")[0].textContent = "Вы проиграли сет!";
        div.style.backgroundColor = "rgba(191, 54, 23, 0.5)";
        div.style.boxShadow = "0 0 5px 1px rgba(148, 87, 72, 1)";
        this.IsResultDisplaying = true;
        div.getElementsByTagName("button")[0].style.cursor = "pointer";
        div.style.opacity = "1";
      }
    } else if (result == -1) {
      this.CountUserWins++;
      if (this.CountUserWins == 3) {
        this.EndGame();
        return;
      }
      if (div?.getElementsByTagName("p")[0]) {
        div.getElementsByTagName("p")[0].textContent = "Вы выйграли сет!";
        div.style.backgroundColor = "rgba(23, 191, 23, 0.5)";
        div.style.boxShadow = "0 0 5px 1px rgb(99, 148, 72)";
        this.IsResultDisplaying = true;
        div.getElementsByTagName("button")[0].style.cursor = "pointer";
        div.style.opacity = "1";
      }
    }
    this.CorrectIndicators();
  }

  // Функция, которая вызывается по кнопке "Ок" после показа результата
  HideDisplayingResult() {
    // Если матч завершён (3 победы)
    if (this.CountSystemWins == 3 || this.CountUserWins == 3) {
      if (this.isCampaignMode && this.CountUserWins == 3 && this.campaignService) {
        // Начисляем кристаллы и открываем следующую планету
        this.campaignService.beatPlanet(this.currentPlanetId);
        sessionStorage.removeItem('campaignMode');
        sessionStorage.removeItem('currentPlanetId');
        this.router.navigate(['campaign']);
      } else {
        this.router.navigate(["game"]);
      }
      return;
    }

    // Скрываем окно результата
    let div = document.getElementById('ResultOf');
    if (div?.getElementsByTagName("p")[0]) {
      div.getElementsByTagName("p")[0].textContent = "";
      this.IsResultDisplaying = false;
      div.getElementsByTagName("button")[0].style.cursor = "default";
      div.style.opacity = "0";
    }

    // Сбрасываем флаги
    this.IsCardChosen = false;
    this.IsPlayerStand = false;
    this.IsSystemStand = false;
    this.Bot.NewRaund();
    this.SumOfUserCards = 0;
    this.SumOfSystemCards = 0;
    this.ClearFields();

    // Раздаём начальные карты
    let AvelPlaceIndx = this.GetIndxOfLastAvelItem(this.UserCardsField);
    let randCard = Math.floor(Math.random() * 10 + 1);
    this.UserCardsField[AvelPlaceIndx].id = randCard.toString();
    this.UserCardsField[AvelPlaceIndx].style.backgroundImage = "url('assets/cards/" + this.UserCardsField[AvelPlaceIndx].id.toString() + ".png')";
    this.SumOfUserCards += randCard;

    let botStartCard = Math.floor(Math.random() * 10 + 1);
    let botIndx = this.GetIndxOfLastAvelItem(this.SystemCardsField);
    this.SystemCardsField[botIndx].id = botStartCard.toString();
    this.SystemCardsField[botIndx].style.backgroundImage = "url('assets/cards/" + botStartCard + ".png')";
    this.SumOfSystemCards += botStartCard;

    // Передаём ход игроку
    this.IsPlayerTurn = true;
    this.ChangeTurn(-1);
    this.CorrectIndicators();
  }

  EndGame() {
    this.CorrectIndicators();
    let div = document.getElementById('ResultOf');
    if (this.CountUserWins == 3) {
      if (div?.getElementsByTagName("p")[0]) {
        div.getElementsByTagName("p")[0].textContent = "Вы выйграли!";
        div.style.backgroundColor = "rgba(23, 191, 23, 0.5)";
        div.style.boxShadow = "0 0 5px 1px rgb(99, 148, 72)";
        this.IsResultDisplaying = true;
        div.getElementsByTagName("button")[0].style.cursor = "pointer";
        div.style.opacity = "1";
      }
    } else {
      if (div?.getElementsByTagName("p")[0]) {
        div.getElementsByTagName("p")[0].textContent = "Вы проиграли!";
        div.style.backgroundColor = "rgba(191, 54, 23, 0.5)";
        div.style.boxShadow = "0 0 5px 1px rgba(148, 87, 72, 1)";
        this.IsResultDisplaying = true;
        div.getElementsByTagName("button")[0].style.cursor = "pointer";
        div.style.opacity = "1";
      }
    }
  }

  ConfirmWindowOk() {
    if (this.isCampaignMode) {
      sessionStorage.removeItem('campaignMode');
      sessionStorage.removeItem('currentPlanetId');
      this.router.navigate(['campaign']);
    } else {
      this.router.navigate(["game"]);
    }
    let confirmWindow = document.getElementById('ConfirmWindow');
    if (confirmWindow) confirmWindow.style.zIndex = "0";
    this.IsResultDisplaying = false;
  }

  ConfirmWindowCancel() {
    let confirmWindow = document.getElementById('ConfirmWindow');
    if (confirmWindow) confirmWindow.style.zIndex = "0";
    this.IsResultDisplaying = false;
  }

  // ========================  ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ========================
  CountOfPlayerFildCards() {
    var count = 0;
    for (let i = 1; i < 9; i++) {
      if (this.UserCardsField[i].style.backgroundImage) count++;
    }
    return count;
  }

  CountOfSystemFildCards() {
    var count = 0;
    for (let i = 1; i < 9; i++) {
      if (this.SystemCardsField[i].style.backgroundImage) count++;
    }
    return count;
  }

  ChangeUserSum(id: string) {
    if (id.length == 2) {
      if (id[0] == 'p') this.SumOfUserCards += parseInt(id[1]);
      else if (id[0] == '-') this.SumOfUserCards -= parseInt(id[1]);
    }
    if (this.SumOfUserCards < 0) this.SumOfUserCards = 0;
  }

  ChangeSystemSum(id: string) {
    if (id.length == 2) {
      if (id[0] == 'p') this.SumOfSystemCards += parseInt(id[1]);
      else if (id[0] == '-') this.SumOfSystemCards -= parseInt(id[1]);
    }
    if (this.SumOfSystemCards < 0) this.SumOfSystemCards = 0;
  }

  TurnOverPlayerCards(id: string) {
    for (let i = 0; i < this.UserCardsField.length; i++) {
      if (this.UserCardsField[i].id[1] == id[0] || this.UserCardsField[i].id[1] == id[2]) {
        if (this.UserCardsField[i].id[0] == 'p') {
          this.UserCardsField[i].id = '-' + this.UserCardsField[i].id[1];
          this.ChangeUserSum(this.UserCardsField[i].id);
          this.ChangeUserSum(this.UserCardsField[i].id);
          this.UserCardsField[i].style.backgroundImage = "url('assets/cards/" + this.UserCardsField[i].id.toString() + ".png')";
        } else if (this.UserCardsField[i].id[0] == '-') {
          this.ChangeUserSum(this.UserCardsField[i].id);
          this.ChangeUserSum(this.UserCardsField[i].id);
          this.UserCardsField[i].id = 'p' + this.UserCardsField[i].id[1];
          this.UserCardsField[i].style.backgroundImage = "url('assets/cards/" + this.UserCardsField[i].id.toString() + ".png')";
        }
      }
    }
    this.ReRenderUserFields();
  }

  GetIndxOfLastAvelItem(arr: HTMLElement[]) {
    for (let i = 0; i < arr.length; i++) {
      if (!arr[i].style.backgroundImage) return i;
    }
    return -1;
  }

  SetCardOnSystemField() {
    let i = this.GetIndxOfLastAvelItem(this.SystemCardsField);
    this.SystemCardsField[i].id = this.Bot.ChosenCardOnTurn;
    this.SystemCardsField[i].style.backgroundImage = "url('assets/cards/" + this.SystemCardsField[i].id.toString() + ".png')";
    this.ChangeSystemSum(this.Bot.ChosenCardOnTurn);
  }

  ClearFields() {
    for (let i = 0; i < this.UserCardsField.length; i++) {
      this.UserCardsField[i].style.backgroundImage = "";
      this.UserCardsField[i].id = "";
      this.SystemCardsField[i].style.backgroundImage = "";
      this.SystemCardsField[i].id = "";
    }
  }

  CorrectIndicators() {
    let userIndic = document.getElementById('PlayerWins');
    let systemIndic = document.getElementById('SystemWins');
    for (let i = 0; i < this.CountUserWins; i++) {
      if (userIndic?.getElementsByTagName("div")[i]) {
        userIndic.getElementsByTagName("div")[i].style.backgroundColor = "#ca2828";
      }
    }
    for (let i = 0; i < this.CountSystemWins; i++) {
      if (systemIndic?.getElementsByTagName("div")[i]) {
        systemIndic.getElementsByTagName("div")[i].style.backgroundColor = "#ca2828";
      }
    }
  }

  ChangeTurn(turn?: number) // 1 - система, -1 - игрок
  {
    let checkerP = document.getElementById('playerTurnChecker');
    let checkerS = document.getElementById('systemTurnChecker');
    if (turn) {
      if (turn == -1) {
        this.IsPlayerTurn = true;
        if (checkerP?.style) checkerP.style.backgroundColor = "#ca2828";
        if (checkerS?.style) checkerS.style.backgroundColor = "#2c2c2c";
      } else {
        this.IsPlayerTurn = false;
        if (checkerP?.style) checkerP.style.backgroundColor = "#2c2c2c";
        if (checkerS?.style) checkerS.style.backgroundColor = "#ca2828";
      }
    } else {
      if (this.IsPlayerTurn) {
        this.IsPlayerTurn = false;
        if (checkerP?.style) checkerP.style.backgroundColor = "#2c2c2c";
        if (checkerS?.style) checkerS.style.backgroundColor = "#ca2828";
      } else {
        this.IsPlayerTurn = true;
        if (checkerP?.style) checkerP.style.backgroundColor = "#ca2828";
        if (checkerS?.style) checkerS.style.backgroundColor = "#2c2c2c";
      }
    }
  }

  UseBotAnswer() {
    if (this.Bot.IsEndTurning) {
      this.Bot.IsEndTurning = true;
      if (!this.IsPlayerStand) this.Bot.IsEndTurning = false;
    }
    if (this.Bot.IsStanding) this.IsSystemStand = true;
    if (this.Bot.ChosenCardOnTurn) {
      this.SetCardOnSystemField();
      this.ClearRandSystemCard();
      this.Bot.CountChosenCard--;
      this.Bot.ChosenCardOnTurn = "";
    }
    if (!this.IsPlayerStand) this.ChangeTurn();
  }

  ClearRandSystemCard() {
    let systemCards = document.getElementById('SystemChosenCards')!.getElementsByTagName("div");
    let idsOfNotCleared = [];
    let count = 0;
    for (let i = 0; i < systemCards.length; i++) {
      if (systemCards[i].style.backgroundImage) idsOfNotCleared[count++] = i;
    }
    if (count > 0) {
      systemCards[idsOfNotCleared[Math.floor(Math.random() * count)]].style.backgroundImage = "";
    }
  }

  ReRenderUserFields() {
    let UserField = document.getElementById('BlockOfPlayerField')?.getElementsByTagName("div");
    for (let i = 0; i < 9; i++) {
      if (UserField && UserField[i]) UserField[i].style.backgroundImage = this.UserCardsField[i].style.backgroundImage;
    }
  }
}