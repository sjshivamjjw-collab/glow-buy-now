import { describe, expect, it } from 'vitest';
import { cleanShareTitle, getPostShareText, getPostShareUrl } from './share';

describe('post sharing helpers', () => {
  it('builds a post share URL from the post id only', () => {
    expect(getPostShareUrl('abc-123', 'https://myripple.co.in/')).toBe('https://myripple.co.in/p/abc-123');
  });

  it('never falls back to long body text when creating the shared message', () => {
    const longBody = 'This is a very long post body that should not be used as share text. '.repeat(20);

    expect(getPostShareText('Short clean title', 'https://myripple.co.in/p/1')).toBe(
      'Short clean title\nhttps://myripple.co.in/p/1'
    );
    expect(getPostShareText(null, 'https://myripple.co.in/p/1')).toBe(
      'Check out this post on Ripple\nhttps://myripple.co.in/p/1'
    );
    expect(getPostShareText(longBody, 'https://myripple.co.in/p/1')).not.toContain(longBody);
  });

  it('sanitizes and caps shared titles', () => {
    const title = '<p>My <strong>favorite</strong>&nbsp;cake</p>';
    expect(cleanShareTitle(title)).toBe('My favorite cake');

    const capped = cleanShareTitle('A'.repeat(200));
    expect(capped).toHaveLength(120);
    expect(capped.endsWith('…')).toBe(true);
  });
});