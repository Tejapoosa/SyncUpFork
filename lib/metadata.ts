import type { Metadata } from 'next';

/**
 * Generate optimized metadata for pages
 */
export function generateMetadata(
  title: string,
  description: string,
  path: string = '',
  image?: string
): Metadata {
  const siteName = 'SyncUp';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://syncup.app';
  const url = `${baseUrl}${path}`;
  const defaultImage = `${baseUrl}/og-image.png`;

  return {
    title: `${title} | ${siteName}`,
    description,
    openGraph: {
      title: `${title} | ${siteName}`,
      description,
      url,
      siteName,
      images: [
        {
          url: image || defaultImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteName}`,
      description,
      images: [image || defaultImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
