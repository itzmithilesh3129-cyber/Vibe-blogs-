import featuredWorkspace from './images/featured_editorial_workspace_1793597159825.jpg';
import typographyCraft from './images/article_typography_craft_1793597160003.jpg';
import cloudInfrastructure from './images/article_cloud_infrastructure_1793597159435.jpg';
import sustainableCities from './images/article_sustainable_cities_1793597160009.jpg';
import creatorEconomy from './images/article_creator_economy_1793597160385.jpg';

export const EDITORIAL_PRESETS: Array<{
  key: string;
  label: string;
  url: string;
  defaultCaption: string;
}> = [
  {
    key: 'asset:workspace',
    label: 'Architectural Studio',
    url: featuredWorkspace,
    defaultCaption: 'Morning light across an independent architectural and software research studio.',
  },
  {
    key: 'asset:typography',
    label: 'Swiss Typography Study',
    url: typographyCraft,
    defaultCaption: 'Archival specimen sheets and grid proportion rulers arranged for editorial layout.',
  },
  {
    key: 'asset:cloud',
    label: 'Optical Systems & Cloud',
    url: cloudInfrastructure,
    defaultCaption: 'Precision glass prisms illustrating multi-region routing and signal isolation.',
  },
  {
    key: 'asset:cities',
    label: 'Biophilic Urbanism',
    url: sustainableCities,
    defaultCaption: 'Mass-timber rooftop pavilion surrounded by drought-resilient urban plantings at dusk.',
  },
  {
    key: 'asset:creator',
    label: 'Independent Publishing Desk',
    url: creatorEconomy,
    defaultCaption: 'Linen-bound notebooks and recording tools on an independent writer’s desk.',
  },
];

const ASSET_MAP: Record<string, string> = Object.fromEntries(
  EDITORIAL_PRESETS.map((item) => [item.key, item.url])
);

export function resolveEditorialImageUrl(rawUrl: string | undefined | null): string {
  if (!rawUrl) return featuredWorkspace;
  if (ASSET_MAP[rawUrl]) return ASSET_MAP[rawUrl];
  return rawUrl;
}
