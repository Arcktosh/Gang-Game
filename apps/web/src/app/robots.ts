import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/onboarding', '/rules', '/privacy', '/terms'],
        disallow: ['/admin', '/api', '/dashboard', '/profile', '/messages'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
