import { CampaignState } from './campaign';
import { initialCollection, PLANETS, rewardFor } from './catalog';

export const SAVE_COOKIE = 'pazaak_save_v1';
export const SAVE_MAX_AGE = 365 * 24 * 60 * 60;
export const SAVE_MAX_LENGTH = 3000;

export interface SavedProgress {
  version: 1;
  completed: number;
  selectedPlanet: number;
  selectedCards: string[];
  soundEnabled: boolean;
}

export function defaultSavedProgress(): SavedProgress {
  return { version: 1, completed: 0, selectedPlanet: 1, selectedCards: [], soundEnabled: true };
}

/** Rebuild rewards from the catalog rather than trusting card data in the browser. */
export function campaignFromSave(saved: SavedProgress): CampaignState {
  const completed = Array.from({ length: saved.completed }, (_, index) => index + 1);
  return {
    completed,
    collection: [...initialCollection(), ...completed.flatMap((id) => rewardFor(id))],
  };
}

export function validSelectedCards(value: unknown, campaign: CampaignState): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= 10 &&
    new Set(value).size === value.length &&
    value.every(
      (id) => typeof id === 'string' && campaign.collection.some((card) => card.instanceId === id),
    )
  );
}

/** A save stores only consecutive campaign victories and owned card instance IDs. */
export function validateSavedProgress(value: unknown): SavedProgress {
  if (typeof value !== 'object' || value === null) return defaultSavedProgress();
  const saved = value as Record<string, unknown>;
  const completed = saved['completed'];
  if (
    saved['version'] !== 1 ||
    typeof completed !== 'number' ||
    !Number.isInteger(completed) ||
    completed < 0 ||
    completed > PLANETS.length
  )
    return defaultSavedProgress();

  const result = { ...defaultSavedProgress(), completed };
  const lastUnlocked = Math.min(completed + 1, PLANETS.length);
  const selectedPlanet = saved['selectedPlanet'];
  result.selectedPlanet =
    typeof selectedPlanet === 'number' &&
    Number.isInteger(selectedPlanet) &&
    selectedPlanet >= 1 &&
    selectedPlanet <= lastUnlocked
      ? selectedPlanet
      : lastUnlocked;
  const selectedCards = saved['selectedCards'];
  if (validSelectedCards(selectedCards, campaignFromSave(result)))
    result.selectedCards = [...selectedCards];
  if (typeof saved['soundEnabled'] === 'boolean') result.soundEnabled = saved['soundEnabled'];
  return result;
}

export function decodeSavedCookie(cookies: string): SavedProgress {
  const item = cookies.split(';').find((part) => part.trim().startsWith(`${SAVE_COOKIE}=`));
  if (!item) return defaultSavedProgress();
  const encoded = item.trim().slice(SAVE_COOKIE.length + 1);
  if (encoded.length > SAVE_MAX_LENGTH) return defaultSavedProgress();
  try {
    return validateSavedProgress(JSON.parse(decodeURIComponent(encoded)));
  } catch {
    return defaultSavedProgress();
  }
}

export function encodeSavedCookie(saved: SavedProgress, secure: boolean): string {
  const encoded = encodeURIComponent(JSON.stringify(validateSavedProgress(saved)));
  return `${SAVE_COOKIE}=${encoded}; Max-Age=${SAVE_MAX_AGE}; Path=/; SameSite=Lax${secure ? '; Secure' : ''}`;
}
