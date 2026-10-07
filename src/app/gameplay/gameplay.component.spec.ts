import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { NgIf } from '@angular/common';
import { Bot } from '../bot';
import { Router } from '@angular/router';
import { CampaignService } from '../campaign.service';

@Component({
  selector: 'app-gameplay',
  standalone: true,
  imports: [NgIf],
  templateUrl: './gameplay.component.html',
  styleUrls: ['./gameplay.component.css']
})
export class GameplayComponent implements AfterViewInit, OnDestroy {
  IssuedCardsType: string[] = [];
  SystemChosenCards: HTMLElement[] = [];
  UserChosenCards: HTMLElement[] = [];
  CountUserWins: number = 0;
  CountSystemWins: number = 0;
  SumOfUserCards: number = 0;
  SumOfSystemCards: number = 0;
  UserCardsField: HTMLElement[] = [];
  SystemCardsField: HTMLElement[] = [];
  IsResultDisplaying: boolean = false;
  IsPlayerTurn: boolean = true;
  IsPlayerStand: boolean = false;
  IsSystemStand: boolean = false;
  IsCardChosen: boolean = false;
  Bot: Bot = new Bot();
  private botTimeout: any = null;

  private isCampaignMode: boolean = false;
  private currentPlanetId: number = 0;

  constructor(private router: Router, private campaignService?: CampaignService) {
    // загрузка выбранных карт из sessionStorage
    for (let i = 0; i < 10; i++) {
      this.IssuedCardsType[i] = sessionStorage.getItem((i + 1).toString()) ?? '0';
    }

    if (sessionStorage.getItem('campaignMode') === 'true') {
      this.isCampaignMode = true;
      const pid = sessionStorage.getItem('currentPlanetId');
      this.currentPlanetId = pid ? parseInt(pid, 10) : 0;
    }

    // инициализация DOM-элементов (код из вашего исходного файла, я его сократил для читаемости)
    // ВАЖНО: вы должны вставить сюда свою полную инициализацию полей и карт, как было ранее.
    // Ниже я приведу только ключевые методы, но для полноты лучше скопировать весь ваш старый конструктор,
    // за исключением того, что я убираю setInterval и заменяю на таймеры.
  }

  ngAfterViewInit() {
    // добавление элементов в DOM (ваш существующий код)
  }

  ngOnDestroy() {
    if (this.botTimeout) clearTimeout(this.botTimeout);
  }

  // --------------------------------------------------------------
  // Методы хода
  // --------------------------------------------------------------
  EndTurn() {
    if (this.IsResultDisplaying) return;
    if (!this.IsPlayerTurn) return;
    if (this.IsPlayerStand) return;

    // Логика добавления случайной карты игроку (как в оригинале)
    // ... (скопируйте из вашего рабочего EndTurn, но уберите setInterval)
    // Упрощённо: добавим карту игроку и проверим перебор
  }

  Stand() {
    if (this.IsResultDisplaying) return;
    if (!this.IsPlayerTurn) return;
    this.IsPlayerStand = true;
    // Проверка, не закончилась ли игра
    if (this.IsSystemStand) {
      this.DetermineRoundWinner();
    } else {
      this.ChangeTurn();
      this.BotAct();
    }
  }

  Surrender() {
    if (this.IsResultDisplaying) return;
    if (!this.IsPlayerTurn) return;
    const confirmWindow = document.getElementById('ConfirmWindow');
    if (confirmWindow) confirmWindow.style.zIndex = '2';
    this.IsResultDisplaying = true;
  }

  // --------------------------------------------------------------
  // Действия бота
  // --------------------------------------------------------------
  BotAct() {
    if (this.botTimeout) clearTimeout(this.botTimeout);
    this.botTimeout = setTimeout(() => {
      // Здесь логика бота: выбор карты, добавление и т.д.
      // После действий бота – если не закончился раунд, вернуть ход игроку
      this.ChangeTurn(); // переключить ход на игрока
      this.botTimeout = null;
    }, 500);
  }

  // --------------------------------------------------------------
  // Завершение раунда и отображение результата
  // --------------------------------------------------------------
  DetermineRoundWinner() {
    let result = 0; // 0 - ничья, -1 победил игрок, 1 победил бот
    if (this.SumOfUserCards > 20 && this.SumOfSystemCards > 20) result = 0;
    else if (this.SumOfUserCards > 20) result = 1;
    else if (this.SumOfSystemCards > 20) result = -1;
    else if (this.SumOfUserCards > this.SumOfSystemCards) result = -1;
    else if (this.SumOfSystemCards > this.SumOfUserCards) result = 1;
    else result = 0;

    if (result === -1) this.CountUserWins++;
    else if (result === 1) this.CountSystemWins++;

    this.ShowResult(result);
  }

  ShowResult(result: number) {
    const div = document.getElementById('ResultOf');
    if (!div) return;
    const p = div.getElementsByTagName('p')[0];
    if (result === 0) p.textContent = 'Ничья!';
    else if (result === 1) p.textContent = 'Вы проиграли сет!';
    else p.textContent = 'Вы выиграли сет!';
    div.style.opacity = '1';
    this.IsResultDisplaying = true;
    this.CorrectIndicators();

    // Если матч завершён (3 победы) – не ждём кнопку "Ок", а сразу переходим?
    // Нет, ждём нажатия.
  }

  HideDisplayingResult() {
    // Если игра окончена (3 победы)
    if (this.CountUserWins === 3 || this.CountSystemWins === 3) {
      if (this.isCampaignMode && this.CountUserWins === 3 && this.campaignService) {
        this.campaignService.beatPlanet(this.currentPlanetId);
        sessionStorage.removeItem('campaignMode');
        sessionStorage.removeItem('currentPlanetId');
        this.router.navigate(['campaign']);
      } else {
        this.router.navigate(['game']);
      }
      return;
    }

    // Скрыть окно результата
    const div = document.getElementById('ResultOf');
    if (div) div.style.opacity = '0';
    this.IsResultDisplaying = false;

    // Сбросить состояние раунда
    this.IsPlayerStand = false;
    this.IsSystemStand = false;
    this.IsCardChosen = false;
    this.Bot.NewRaund();

    // Очистить поля и сбросить суммы
    this.ClearFields();
    this.SumOfUserCards = 0;
    this.SumOfSystemCards = 0;

    // Раздать начальные карты (игроку и боту)
    const playerCard = Math.floor(Math.random() * 10) + 1;
    const playerSlot = this.GetIndxOfLastAvelItem(this.UserCardsField);
    if (playerSlot !== -1) {
      this.UserCardsField[playerSlot].id = playerCard.toString();
      this.UserCardsField[playerSlot].style.backgroundImage = `url('assets/cards/${playerCard}.png')`;
      this.SumOfUserCards += playerCard;
    }

    const botCard = Math.floor(Math.random() * 10) + 1;
    const botSlot = this.GetIndxOfLastAvelItem(this.SystemCardsField);
    if (botSlot !== -1) {
      this.SystemCardsField[botSlot].id = botCard.toString();
      this.SystemCardsField[botSlot].style.backgroundImage = `url('assets/cards/${botCard}.png')`;
      this.SumOfSystemCards += botCard;
    }

    // Передать ход игроку
    this.IsPlayerTurn = true;
    this.ChangeTurn(-1); // вызываем вашу функцию переключения индикаторов

    this.CorrectIndicators();
  }

  // --------------------------------------------------------------
  // Вспомогательные методы (заглушки – вставьте свои)
  // --------------------------------------------------------------
  ChangeTurn(turn?: number) { /* ваш код */ }
  ClearFields() { /* ваш код */ }
  GetIndxOfLastAvelItem(arr: HTMLElement[]): number { /* ваш код */ return -1; }
  CorrectIndicators() { /* ваш код */ }
  // остальные методы (CountOfPlayerFildCards, ChangeUserSum и т.д.)
}