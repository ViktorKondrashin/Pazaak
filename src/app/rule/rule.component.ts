import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { cardFromType } from '../core/catalog';
import { BoardCard } from '../core/models';
import { CardComponent } from '../shared/card.component';

const mainExample = (value: number, signedValue = value): BoardCard => ({
  instanceId: `rule-main-${value}`,
  typeId: `main-${value}`,
  kind: 'main',
  value,
  signedValue,
});

const sideExample = (type: string, signedValue: number): BoardCard => ({
  ...cardFromType(type, `rule-${type}`),
  signedValue,
});

@Component({
  selector: 'app-rule',
  standalone: true,
  imports: [RouterLink, CardComponent],
  template: `
    <main class="page rules-page">
      <header class="page-header rules-header">
        <div>
          <span class="eyebrow">PURE PAZAAK · СПРАВОЧНИК</span>
          <br />
          <a
            class="text-button back-link"
            routerLink="/"
          >
            ← Назад
          </a>
          <h1>Правила игры</h1>
        </div>
      </header>
      <section class="rules-intro panel">
        <div class="rule-target" aria-hidden="true">20</div>
        <div>
          <h2>Ближе к двадцати</h2>
          <p>
            Наберите как можно больше очков, не превысив 20. Чтобы победить в матче, выиграйте
            <b>три сета</b>. Ничья не добавляет победу никому.
          </p>
        </div>
      </section>
      <article class="rules-content" aria-label="Правила по порядку">
        <section class="rule-section panel">
          <span class="rule-index">01</span>
          <h2>Подготовьте свою колоду</h2>
          <p>
            Ваша коллекция — это начальные карты и награды за победы в кампании. Перед матчем
            выберите из неё <b>10 карт: это ваша боковая колода</b>. На выбор есть одна минута.
            Если вы не успеете, игра заменит незавершённый выбор случайными десятью картами.
          </p>
          <p>
            В начале каждого сета вы получаете <b>четыре случайные карты из этих десяти</b> —
            это ваша рука. Соперник получает четыре карты из своей колоды. В новом сете руки
            раздаются заново; сыгранные карты не пропадают из коллекции. Первый игрок выбирается
            случайно перед каждым сетом.
          </p>
        </section>
        <section class="rule-section panel">
          <span class="rule-index">02</span>
          <h2>Зелёные карты приходят из общей колоды</h2>
          <div class="rule-card-line">
            <figure class="rule-card-illustration">
              <app-card [card]="greenCard" />
              <figcaption>Из общей колоды</figcaption>
            </figure>
            <div>
              <p>
                В начале вашего хода игра сама кладёт на поле зелёную карту из общей, или главной,
                колоды. На ней написано число <b>от 1 до 10 без знака «+»</b>, но при доборе это число
                всегда прибавляется к вашей сумме. Например, зелёная 4 добавляет 4 очка.
              </p>
              <p>
                <b>Общая колода не входит в вашу коллекцию и в выбранные вами 10 карт.</b> Вы её
                не собираете: из неё автоматически получают карты оба игрока. Четыре карты у вас
                в руке — отдельные карты, которыми вы можете изменить свою сумму.
              </p>
            </div>
          </div>
        </section>
        <section class="rule-section panel">
          <span class="rule-index">03</span>
          <h2>Сделайте ход</h2>
          <p>
            После зелёной карты можно сыграть <b>не более одной карты из руки</b>. Это необязательно.
            Розыгрыш карты ещё не заканчивает ваш ход и не добавляет новую зелёную карту.
          </p>
          <p>
            После карты отдельно выберите «Завершить ход» или «Стоп». Обе кнопки доступны и без
            розыгрыша карты. «Завершить ход» передаёт ход дальше, а «Стоп» фиксирует вашу сумму до
            конца сета. Если соперник уже остановился, вы ходите последовательно с обычным добором.
          </p>
        </section>
        <section class="rule-section panel">
          <span class="rule-index">04</span>
          <h2>Используйте карты из руки</h2>
          <div class="rule-card-line">
            <figure class="rule-card-illustration rule-card-pair" aria-label="Карты +2 и −4">
              <app-card [card]="positiveCard" />
              <app-card [card]="negativeCard" />
            </figure>
            <div>
              <h3>Положительные и отрицательные</h3>
              <p>
                Прибавляют или вычитают указанное число. Например, при сумме 18 карта +2 даст 20,
                а карта −4 даст 14.
              </p>
              <div class="rule-calculations" aria-label="Примеры подсчёта">
                <span>18 + 2 = <b class="rule-positive-total">20</b></span>
                <span>18 − 4 = <b class="rule-negative-total">14</b></span>
              </div>
            </div>
          </div>
          <div class="rule-card-line">
            <figure class="rule-card-illustration">
              <app-card [card]="dualCard" />
              <figcaption>Знак выбираете вы</figcaption>
            </figure>
            <div>
              <h3>Карты с двумя знаками</h3>
              <p>
                Карта ±3 позволяет выбрать плюс или минус. Нажмите на верхнюю половину,
                чтобы прибавить 3, или на нижнюю, чтобы вычесть 3.
              </p>
              <div class="rule-calculations rule-signs" aria-label="Выбор знака карты">
                <span><b>↑ +3</b> верхняя половина</span>
                <span><b>↓ −3</b> нижняя половина</span>
              </div>
            </div>
          </div>
          @for (example of flipExamples; track example.card.typeId) {
            <div class="rule-flip-example">
              <div class="rule-card-line">
                <figure class="rule-card-illustration">
                  <app-card [card]="example.card" />
                  <figcaption>Меняет знаки</figcaption>
                </figure>
                <div>
                  <h3>Перевёртыш {{ example.card.typeId }}</h3>
                  <p>
                    Меняет знак у <b>всех уже лежащих на вашем поле {{ example.targets }}</b>.
                    Положительные становятся отрицательными, отрицательные — положительными.
                    Это касается и зелёных карт из общей колоды, и сыгранных карт из руки.
                  </p>
                </div>
              </div>
              <figure class="rule-flip-demo" [attr.aria-label]="'Пример действия ' + example.card.typeId">
                <div class="rule-board-stage">
                  <span class="rule-stage-label">До переворота</span>
                  <div class="rule-example-cards">
                    @for (card of example.before; track card.instanceId) {
                      <app-card [card]="card" [signedValue]="card.signedValue" />
                    }
                  </div>
                  <span class="rule-score">Сумма <b>{{ example.beforeScore }}</b></span>
                </div>
                <div class="rule-change">
                  <span class="rule-change-arrow" aria-hidden="true">→</span>
                  <span>Сыграли <b>{{ example.card.typeId }}</b></span>
                </div>
                <div class="rule-board-stage">
                  <span class="rule-stage-label">После переворота</span>
                  <div class="rule-example-cards">
                    @for (card of example.after; track card.instanceId) {
                      <app-card
                        [card]="card"
                        [signedValue]="card.signedValue"
                        [class.rule-changed]="card.signedValue !== example.before[$index].signedValue"
                      />
                    }
                    <app-card [card]="example.card" />
                  </div>
                  <span class="rule-score">Сумма <b>{{ example.afterScore }}</b></span>
                </div>
                <figcaption>
                  <b>{{ example.calculation }}</b>. {{ example.explanation }}
                  Подсвечены все карты, которые поменяли знак.
                  Сам перевёртыш занял ещё один слот и добавил 0 очков.
                </figcaption>
              </figure>
            </div>
          }
          <p class="rule-flip-note">
            Перевёртыш действует только на карты, которые уже лежат <b>на вашем поле</b>.
            Новые карты и поле соперника он не затрагивает. Если сыграть такой же перевёртыш
            повторно, знак подходящих карт снова изменится: например, −2 станет +2.
            Сам перевёртыш даёт <b>0 очков и занимает один слот</b>, как любая другая карта.
          </p>
        </section>
        <section class="rule-section panel">
          <span class="rule-index">05</span>
          <h2>Остановитесь вовремя и сравните результат</h2>
          <p>
            Перебор после добора ещё можно исправить одной картой руки. При нажатии «Завершить ход»
            сумма 20 и выше автоматически останавливает набор. После карты вы сначала подтверждаете
            решение одной из кнопок. Ровно 20 само по себе ещё не означает победу.
          </p>
          <p>
            Сет заканчивается, когда оба участника остановились или один заполнил девятый слот.
            Девятая карта сначала применяет свой эффект, затем сравниваются очки.
          </p>
          <p>
            Из сумм до 20 выигрывает большая. При одном переборе побеждает другой игрок. Равные
            суммы или два перебора дают ничью. Отрицательная сумма допустима.
          </p>
          <p>
            После сета оба участника подтверждают следующий. Третья победа сразу завершает матч.
            Сдача и добровольный выход дают победу сопернику, сохраняя фактический счёт сетов.
          </p>
        </section>
        <section class="rule-section panel">
          <span class="rule-index">06</span>
          <h2>Если общая колода закончилась</h2>
          <p>
            В общей колоде 40 карт — по четыре каждого значения от 1 до 10. Между сетами она
            не пополняется. При пустой колоде добора нет, но можно использовать руку. Если все ещё
            активные игроки последовательно пропустили ход без изменения поля, сет завершается
            сравнением сумм.
          </p>
        </section>
        <section class="rule-section panel">
          <span class="rule-index">07</span>
          <h2>Кампания и сетевая игра</h2>
          <p>
            В кампании пять планет. Первая победа на каждой даёт новые карты и открывает следующую
            планету. Полученные карты можно выбирать и для матчей с ботом, и для сетевой игры.
          </p>
          <p>
            Для сетевой игры передайте другу свой восьмизначный ID или отправьте приглашение на его
            ID. Оба игрока собирают колоды, затем начинается матч. Аварийная потеря связи прерывает
            матч без назначения победителя.
          </p>
        </section>
        <section class="rule-section panel">
          <span class="rule-index">08</span>
          <h2>Сохранение прогресса</h2>
          <p>
            Пройденные планеты, полученные карты, выбранные колода и планета, а также настройка
            звука <b>сохраняются в cookie-файлах этого браузера</b>. Можно выйти в меню, обновить
            страницу или закрыть браузер — эти результаты сохранятся, если браузер разрешает
            cookies и не удаляет их автоматически при закрытии.
          </p>
          <p>
            <b>Чтобы начать кампанию заново, очистите cookie-файлы этого сайта</b> в настройках
            браузера и обновите страницу. Вместе с прогрессом сбросятся сохранённый выбор и
            настройка звука.
          </p>
          <p>
            Незавершённый матч не сохраняется: после обновления страницы или закрытия браузера
            его нужно начать заново. Уже полученные награды при этом остаются.
          </p>
        </section>
      </article>
      <footer class="page-footer">
        <a
          class="button subtle"
          routerLink="/"
        >
          ← Главное меню
        </a>
        <a
          class="button success"
          routerLink="/campaign"
          >Играть с ботом →</a
        >
      </footer>
    </main>
  `,
})
export class RuleComponent {
  readonly greenCard = mainExample(4);
  readonly positiveCard = cardFromType('+2', 'rule-positive');
  readonly negativeCard = cardFromType('-4', 'rule-negative');
  readonly dualCard = cardFromType('±3', 'rule-dual');
  readonly flipExamples = [
    {
      card: cardFromType('2&4', 'rule-flip24'),
      targets: 'двоек и четвёрок',
      before: [mainExample(4), sideExample('+2', 2), sideExample('-4', -4), mainExample(10)],
      after: [mainExample(4, -4), sideExample('+2', -2), sideExample('-4', 4), mainExample(10)],
      beforeScore: 12,
      afterScore: 8,
      calculation: '−4 − 2 + 4 + 10 + 0 = 8',
      explanation: 'Синяя +2 стала −2, красная −4 стала +4, а зелёная 4 стала −4. Десятка не изменилась.',
    },
    {
      card: cardFromType('3&6', 'rule-flip36'),
      targets: 'троек и шестёрок',
      before: [mainExample(6), sideExample('+3', 3), sideExample('-3', -3), mainExample(10)],
      after: [mainExample(6, -6), sideExample('+3', -3), sideExample('-3', 3), mainExample(10)],
      beforeScore: 16,
      afterScore: 4,
      calculation: '−6 − 3 + 3 + 10 + 0 = 4',
      explanation: 'Синяя +3 стала −3, красная −3 стала +3, а зелёная 6 стала −6. Десятка не изменилась.',
    },
  ];
}
