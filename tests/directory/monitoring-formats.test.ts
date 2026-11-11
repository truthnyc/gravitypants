import { describe, expect, it } from 'vitest';
import { loadEnv } from 'vite';
const env = loadEnv('test', process.cwd(), 'VITE_');
describe('Directory website reel formats', () => {
  it.each([['45', '4x5'], ['54', '5x4']])('returns website format %s as %s', async (stored, expected) => {
    const headers = { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' };
    const response = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/directory_faceted_search`, { method: 'POST', headers, body: JSON.stringify({page_size:240}) });
    expect(response.ok).toBe(true);
    const result = await response.json();
    const source = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/site_reels?select=id&published=eq.true&format=eq.${stored}`, { headers });
    expect(source.ok).toBe(true);
    const rows: {id:string}[] = await source.json();
    const visible = rows.map(row => result.reels.find((reel: {id:string;kind:string}) => reel.id === row.id && reel.kind === 'site')).filter(Boolean);
    expect(visible.length).toBeGreaterThan(0);
    for (const reel of visible) expect(reel.formats).toEqual([expected]);
  });
});