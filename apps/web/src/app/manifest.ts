import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DrugDeal Game',
    short_name: 'DrugDeal',
    description: 'A fictional text-based persistent browser MMO.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    orientation: 'portrait-primary',
    categories: ['games', 'entertainment'],
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/maskable-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        description: 'Open your character dashboard.',
        url: '/dashboard',
      },
      {
        name: 'Jobs',
        short_name: 'Jobs',
        description: 'Work a job shift.',
        url: '/jobs',
      },
      {
        name: 'Crimes',
        short_name: 'Crimes',
        description: 'Attempt a fictional crime action.',
        url: '/crimes',
      },
    ],
  };
}
