import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const term = (url.searchParams.get('term') || '').trim();
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '30', 10) || 30, 1), 50);

    if (!term) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const itunesUrl = `https://itunes.apple.com/search?media=music&entity=song&limit=${limit}&term=${encodeURIComponent(term)}`;
    const res = await fetch(itunesUrl, { headers: { 'User-Agent': 'MyRipple/1.0' } });
    if (!res.ok) {
      return new Response(JSON.stringify({ results: [], error: `iTunes responded ${res.status}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const json = await res.json();
    const results = (json.results || [])
      .filter((r: any) => !!r.previewUrl)
      .map((r: any) => ({
        trackId: r.trackId,
        trackName: r.trackName,
        artistName: r.artistName,
        previewUrl: r.previewUrl,
        artworkUrl100: r.artworkUrl100,
      }));

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ results: [], error: (e as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
