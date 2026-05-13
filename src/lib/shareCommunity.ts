// Share helper used by community detail / room headers.
// Uses the native Web Share sheet when available, otherwise copies the URL.

export async function shareCommunity(opts: {
  slug: string;
  name: string;
  description?: string | null;
  toast?: (args: { title: string; description?: string }) => void;
}) {
  const url = `${window.location.origin}/c/${opts.slug}`;
  const title = opts.name;
  const text = opts.description?.trim()
    ? `${opts.name} — ${opts.description.slice(0, 140)}`
    : `Join ${opts.name} on LiveCart`;

  try {
    // Native share sheet (mobile + some desktop)
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      await (navigator as any).share({ title, text, url });
      return;
    }
  } catch (err: any) {
    // User cancelled — silently bail
    if (err?.name === 'AbortError') return;
  }

  try {
    await navigator.clipboard.writeText(url);
    opts.toast?.({ title: 'Link copied', description: url });
  } catch {
    opts.toast?.({ title: 'Share this link', description: url });
  }
}
