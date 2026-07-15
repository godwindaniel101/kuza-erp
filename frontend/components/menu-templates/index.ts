import { ComponentType } from 'react';
import { PublicMenuData } from '@/lib/menu-public';
import { TemplateKey, TemplateProps } from './types';
import ElegantTemplate from './ElegantTemplate';
import MinimalTemplate from './MinimalTemplate';
import NoirTemplate from './NoirTemplate';
import GalleryTemplate from './GalleryTemplate';
import BistroTemplate from './BistroTemplate';
import GrandTemplate from './GrandTemplate';

export { ARCHETYPES, getArchetype, resolveTheme } from './themes';
export type { ArchetypeMeta } from './themes';
export type { MenuTheme, TemplateKey, TemplateProps } from './types';

const COMPONENTS: Record<TemplateKey, ComponentType<TemplateProps>> = {
  elegant: ElegantTemplate,
  minimal: MinimalTemplate,
  noir: NoirTemplate,
  gallery: GalleryTemplate,
  bistro: BistroTemplate,
  grand: GrandTemplate,
};

export function getTemplateComponent(
  templateKey: string,
): ComponentType<TemplateProps> {
  return COMPONENTS[templateKey as TemplateKey] || MinimalTemplate;
}

/** Compact sample data used by Menu Studio's live template thumbnails. */
export const SAMPLE_MENU_DATA: PublicMenuData = {
  venue: {
    name: 'The Palm House',
    tagline: 'Kitchen & cocktails since 2019',
    logoUrl: null,
    address: '14 Marina Road, Lagos',
    phone: null,
    whatsapp: null,
    instagram: null,
    wifiName: null,
    wifiPassword: null,
    currency: 'NGN',
    showPrices: true,
    templateKey: 'minimal',
    themeKey: 'cloud',
    accentColor: null,
    slug: 'sample',
  },
  menus: [
    {
      id: 'sample-menu',
      name: 'All Day',
      categories: [
        {
          id: 'sample-starters',
          name: 'Starters',
          items: [
            {
              id: 's1',
              name: 'Suya Spring Rolls',
              description: 'Crisp rolls, spiced beef, yaji dip',
              price: 4500,
              isAvailable: true,
            },
            {
              id: 's2',
              name: 'Grilled Prawn Skewers',
              description: 'Charred lime, scotch bonnet butter',
              price: 7200,
              isAvailable: true,
            },
          ],
        },
        {
          id: 'sample-mains',
          name: 'Mains',
          items: [
            {
              id: 'm1',
              name: 'Smoky Jollof & Chicken',
              description: 'Party-style jollof, grilled half chicken',
              price: 9800,
              isAvailable: true,
            },
            {
              id: 'm2',
              name: 'Pepper Goat Meat',
              description: 'Slow-braised, plantain, fresh herbs',
              price: 11500,
              isAvailable: false,
            },
            {
              id: 'm3',
              name: 'Coconut Curry Fish',
              description: 'Croaker fillet, basmati, coriander',
              price: 10200,
              isAvailable: true,
            },
          ],
        },
      ],
    },
  ],
};
