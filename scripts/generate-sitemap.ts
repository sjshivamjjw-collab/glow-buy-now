// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
// Pulls public posts and profiles from Supabase so Google can crawl every page.
// Only lists high-signal URLs — thin/utility routes are omitted so Google spends
// crawl budget on content pages that can actually rank.

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://myripple.co.in';
const SUPABASE_URL = 'https://yplyqhhxuouzpradiyvr.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwbHlxaGh4dW91enByYWRpeXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NzE2NTUsImV4cCI6MjA5NDE0NzY1NX0.iDgBysk8coBHAktM7CC-wS40h6LN_oV6zIwwmN2gMa4';

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: string;
}

// Only include content/marketing routes. /auth, /delete-account, /support are
// utility pages with no unique indexable content — omitted so Google focuses on posts.
const staticEntries: SitemapEntry[] = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.5' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
];

// Minimum plain-text length for a post to be worth submitting.
// Below this threshold Google typically flags "Crawled – currently not indexed".
const MIN_POST_TEXT_LENGTH = 80;

function stripHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchDynamic(): Promise<SitemapEntry[]> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    // Public posts (exclude anonymous and hidden — same filters as PostDetailPage's loader).
    const { data: posts, error: postsErr } = await supabase
      .from('posts')
      .select('id, title, body, created_at, user_id')
      .eq('is_anonymous', false)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(5000);
    if (postsErr) console.warn('sitemap: posts query failed', postsErr.message);

    // Public profiles that actually have something to show — need a display name
    // AND at least one non-hidden, non-anonymous post. Empty profiles are noise
    // for Google and account for most "Discovered - not indexed" reports.
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, name, username')
      .limit(5000);
    if (profErr) console.warn('sitemap: profiles query failed', profErr.message);

    // Filter posts by content richness so Google sees indexable pages only.
    const postEntries: SitemapEntry[] = (posts || [])
      .filter((p: any) => {
        const text = `${p.title || ''} ${stripHtml(p.body)}`.trim();
        return text.length >= MIN_POST_TEXT_LENGTH;
      })
      .map((p: any) => ({
        path: `/p/${p.id}`,
        lastmod: p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : undefined,
        changefreq: 'weekly',
        priority: '0.7',
      }));

    // Only list profiles that authored at least one public post above threshold.
    const authorIdsWithContent = new Set(
      (posts || [])
        .filter((p: any) => `${p.title || ''} ${stripHtml(p.body)}`.trim().length >= MIN_POST_TEXT_LENGTH)
        .map((p: any) => p.user_id)
        .filter(Boolean),
    );

    const profileEntries: SitemapEntry[] = (profiles || [])
      .filter((u: any) => (u.display_name || u.username) && authorIdsWithContent.has(u.id))
      .map((u: any) => ({
        path: `/u/${u.id}`,
        lastmod: u.updated_at ? new Date(u.updated_at).toISOString().slice(0, 10) : undefined,
        changefreq: 'weekly',
        priority: '0.5',
      }));

    return [...postEntries, ...profileEntries];
  } catch (err) {
    console.warn('sitemap: dynamic fetch failed, shipping static entries only', err);
    return [];
  }
}

function buildXml(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join('\n'),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    '',
  ].join('\n');
}

(async () => {
  const dynamic = await fetchDynamic();
  const all = [...staticEntries, ...dynamic];
  writeFileSync(resolve('public/sitemap.xml'), buildXml(all));
  console.log(`sitemap.xml written (${all.length} entries: ${staticEntries.length} static + ${dynamic.length} dynamic)`);
})();
