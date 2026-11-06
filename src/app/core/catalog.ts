import { Card, CardKind, requireRule } from './models';

const START = ['+2', '+2', '+2', '+3', '+3', '+4', '+4', '+5', '+5', '-2', '-2', '-3', '-3', '-4'];
export const REWARDS: readonly string[][] = [
  ['+4', '+5', '-5', '±2', '±3'],
  ['+6', '-6', '±2', '±4', '2&4'],
  ['+6', '-6', '±2', '±5', '3&6'],
  ['±5', '±5', '±6', '±6', '-5'],
  ['+1', '+1', '+1', '-1', '-1', '-1', '±1'],
];
export const PLANETS = [
  { id: 1, name: 'Татуин', color: '#e4a862', subtitle: 'Первый шаг' },
  { id: 2, name: 'Дантуин', color: '#7ad9a5', subtitle: 'Новые возможности' },
  { id: 3, name: 'Кашиик', color: '#65c1c7', subtitle: 'Смена знака' },
  { id: 4, name: 'Манаан', color: '#6e9cfa', subtitle: 'Точный расчёт' },
  { id: 5, name: 'Коррибан', color: '#d285ca', subtitle: 'Последний поединок' },
] as const;

export function cardFromType(typeId: string, instanceId: string): Card {
  let kind: CardKind;
  let value = 0;
  if (typeId === '2&4') kind = 'flip24';
  else if (typeId === '3&6') kind = 'flip36';
  else {
    requireRule(/^[+−\-±][1-6]$/.test(typeId), 'CARD_TYPE', 'Неизвестный тип карты');
    kind = typeId[0] === '+' ? 'positive' : typeId[0] === '±' ? 'dual' : 'negative';
    value = Number(typeId.slice(1));
  }
  return { instanceId, typeId, kind, value };
}

export function initialCollection(): Card[] {
  return START.map((type, i) => cardFromType(type, `start-${String(i).padStart(2, '0')}`));
}

export function rewardFor(planetId: number): Card[] {
  requireRule(
    Number.isInteger(planetId) && planetId >= 1 && planetId <= 5,
    'PLANET',
    'Неизвестная планета',
  );
  return REWARDS[planetId - 1].map((type, i) => cardFromType(type, `reward-${planetId}-${i}`));
}

export function collectionBefore(planetId: number): Card[] {
  const cards = initialCollection();
  for (let id = 1; id < planetId; id++) cards.push(...rewardFor(id));
  return cards;
}

export function mainDeck(): Card[] {
  return Array.from({ length: 40 }, (_, i) => ({
    instanceId: `main-${i}`,
    typeId: `main-${(i % 10) + 1}`,
    kind: 'main',
    value: (i % 10) + 1,
  }));
}

export function selectDeck(collection: Card[], ids: string[]): Card[] {
  requireRule(ids.length === 10 && new Set(ids).size === 10, 'DECK_SIZE', 'Наберите ровно 10 карт');
  return ids.map((id) => {
    const card = collection.find((c) => c.instanceId === id);
    requireRule(card, 'DECK_CARD', 'Эта карта недоступна');
    return { ...card };
  });
}

export function cardLabel(card: Card): string {
  return card.kind === 'main' ? String(card.value) : card.typeId.replace('-', '−');
}

/** Display order only; never change the shuffled deck or order of cards on the board. */
export function compareCards(a: Card, b: Card): number {
  const order: Record<CardKind, number> = {
    main: 0,
    positive: 1,
    negative: 2,
    dual: 3,
    flip24: 4,
    flip36: 5,
  };
  return (
    order[a.kind] - order[b.kind] || a.value - b.value || a.instanceId.localeCompare(b.instanceId)
  );
}
