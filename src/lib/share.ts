import { isNative } from '@/lib/platform';

const DEFAULT_POST_TITLE = 'Check out this post on Ripple';
const MAX_SHARE_TITLE_LENGTH = 120;

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

export const cleanShareTitle = (title: string | null | undefined) => {
  const clean = stripHtml(title || '');
  if (!clean) return DEFAULT_POST_TITLE;
  if (clean.length <= MAX_SHARE_TITLE_LENGTH) return clean;
  return `${clean.slice(0, MAX_SHARE_TITLE_LENGTH - 1).trimEnd()}…`;
};

export const getPostShareUrl = (postId: string, origin = window.location.origin) =>
  `${origin.replace(/\/$/, '')}/p/${encodeURIComponent(postId)}`;

export const getPostShareText = (title: string | null | undefined, url: string) =>
  `${cleanShareTitle(title)}\n${url}`;

const isShareCancelled = (error: unknown) => {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error || '');
  return /abort|cancel/i.test(message);
};

export const sharePostLink = async ({
  postId,
  title,
  origin = window.location.origin,
}: {
  postId: string;
  title: string | null | undefined;
  origin?: string;
}): Promise<'shared' | 'copied' | 'cancelled'> => {
  const shareTitle = cleanShareTitle(title);
  const url = getPostShareUrl(postId, origin);
  const text = getPostShareText(shareTitle, url);

  try {
    if (isNative()) {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: shareTitle, text });
      return 'shared';
    }

    if (navigator.share) {
      await navigator.share({ title: shareTitle, text });
      return 'shared';
    }
  } catch (error) {
    if (isShareCancelled(error)) return 'cancelled';
  }

  await navigator.clipboard.writeText(text);
  return 'copied';
};