import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://myripple.co.in';
const DEFAULT_OG_IMAGE =
  'https://storage.googleapis.com/gpt-engineer-file-uploads/8aokHuFXafRBD5Nq1p93DjVELYE2/social-images/social-1778658896362-ripple_final_app_icon_4096.webp';

export interface SEOProps {
  /** Full page title (under 60 chars recommended). Defaults to the site title. */
  title?: string;
  /** Meta description (50–160 chars recommended). */
  description?: string;
  /** Path-only canonical (e.g. "/about"). Defaults to current pathname. */
  path?: string;
  /** Absolute image URL for social previews. */
  image?: string;
  /** Open Graph type. Defaults to "website". */
  type?: 'website' | 'article' | 'profile';
  /** Optional JSON-LD structured-data object(s). */
  jsonLd?: Record<string, any> | Record<string, any>[];
  /** Set to true to hide this route from search engines. */
  noindex?: boolean;
}

const DEFAULT_TITLE = 'Ripple — Everyday things worth sharing';
const DEFAULT_DESCRIPTION =
  'Discover genuine recommendations, reviews, travel diaries, food spots and little things from everyday life shared by real people.';

const SEO = ({
  title,
  description,
  path,
  image,
  type = 'website',
  jsonLd,
  noindex = false,
}: SEOProps) => {
  const resolvedPath =
    path ??
    (typeof window !== 'undefined' ? window.location.pathname : '/');
  const url = `${SITE_URL}${resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`}`;
  const finalTitle = title ?? DEFAULT_TITLE;
  const finalDesc = description ?? DEFAULT_DESCRIPTION;
  const finalImage = image ?? DEFAULT_OG_IMAGE;
  const jsonLdArray = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDesc} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDesc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:site_name" content="Ripple" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDesc} />
      <meta name="twitter:image" content={finalImage} />

      {jsonLdArray.map((obj, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(obj)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
