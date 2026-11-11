import { afterAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';

// Real database regressions; all approval fixtures are rolled back, with no emails.
const sql = postgres({ max: 1 });
afterAll(() => sql.end());

describe.skipIf(!process.env.PGHOST)('Monitoring database regressions', () => {
  it('approves six valid moods and keeps all six brand mood links', async () => {
    const connection = await sql.reserve();
    await connection`BEGIN`;
    try {
      const [admin] = await connection`SELECT user_id FROM public.user_roles WHERE role='admin' LIMIT 1`;
      const [category] = await connection`SELECT name FROM public.categories LIMIT 1`;
      const moods = await connection`SELECT name FROM public.moods ORDER BY name LIMIT 6`;
      expect(moods).toHaveLength(6);
      if (!admin || !category) throw new Error('Approval fixtures need an existing staff role and category');
      const names = moods.map(m => m.name);
      const [request] = await connection`INSERT INTO public.brand_requests(name,email,brand,website,category,description,moods,status)
        VALUES('Monitoring test','monitoring@example.com','Monitoring rollback brand',${`https://monitoring-${crypto.randomUUID()}.example.com`},${category.name},'Rollback-only approval verification',${names},'pending') RETURNING id`;
      if (!request) throw new Error('Request fixture was not created');
      const [approved] = await connection`SELECT public.approve_brand_request(${request.id}::uuid,${admin.user_id}::uuid,NULL) AS id`;
      if (!approved) throw new Error('Approval returned no brand');
      const [brand] = await connection`SELECT moods,status FROM public.directory_brands WHERE id=${approved.id}`;
      expect(brand?.moods).toEqual(names);
      expect(brand?.status).toBe('draft');
      const [links] = await connection`SELECT count(*)::int AS count FROM public.brand_moods WHERE brand_id=${approved.id}`;
      expect(links?.count).toBe(6);
      const [review] = await connection`SELECT status,created_brand_id FROM public.brand_requests WHERE id=${request.id}`;
      expect(review?.status).toBe('approved');
      expect(review?.created_brand_id).toBe(approved.id);
    } finally {
      await connection`ROLLBACK`;
      connection.release();
    }
  });

  it.each([['45', '4x5'], ['54', '5x4']])('returns website format %s as %s', async (stored, expected) => {
    const connection = await sql.reserve();
    await connection`BEGIN`;
    try {
      await connection`SET LOCAL ROLE anon`;
      const [result] = await connection`SELECT public.directory_faceted_search(page_size=>240) AS data`;
      const reels = result?.data.reels as { id: string; kind: string; formats: string[] }[];
      await connection`RESET ROLE`;
      const rows = await connection`SELECT id FROM public.site_reels WHERE published AND format=${stored}`;
      const visible = rows.map(row => reels.find(reel => reel.id === row.id && reel.kind === 'site')).filter(Boolean);
      expect(visible.length).toBeGreaterThan(0);
      for (const reel of visible) expect(reel?.formats).toEqual([expected]);
    } finally {
      await connection`ROLLBACK`;
      connection.release();
    }
  });
});