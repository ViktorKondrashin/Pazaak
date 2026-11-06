import { Card, MatchState, requireRule } from './models';
import { initialCollection, rewardFor } from './catalog';

export interface CampaignState {
  completed: number[];
  collection: Card[];
}

export function newCampaign(): CampaignState {
  return { completed: [], collection: initialCollection() };
}

export function isUnlocked(campaign: CampaignState, planetId: number): boolean {
  return (
    Number.isInteger(planetId) &&
    planetId >= 1 &&
    planetId <= 5 &&
    (planetId === 1 || campaign.completed.includes(planetId - 1))
  );
}

export function awardCampaign(
  campaign: CampaignState,
  match: MatchState,
  humanUid: string,
): CampaignState {
  if (
    match.mode !== 'campaign' ||
    match.phase !== 'finished' ||
    match.winner !== humanUid ||
    match.planetId === null
  )
    return campaign;
  requireRule(isUnlocked(campaign, match.planetId), 'PLANET_LOCKED', 'Планета ещё закрыта');
  if (campaign.completed.includes(match.planetId)) return campaign;
  return {
    completed: [...campaign.completed, match.planetId],
    collection: [...campaign.collection, ...rewardFor(match.planetId)],
  };
}
