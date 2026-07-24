import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mayalexhn.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/', '/chat', '/cuenta', '/reset-password'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
