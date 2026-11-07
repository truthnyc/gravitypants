import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/marketing-campaign/$id")({
  server: { handlers: { GET: async ({ request, params }) => {
    const unavailable = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
    const token = new URL(request.url).searchParams.get("token");
    if (!/^[a-f0-9-]{36}$/i.test(params.id) || !token || !/^[a-f0-9-]{72}$/i.test(token)) return unavailable();
    const { hashCampaignToken, campaignHtml } = await import("@/lib/stillframe/marketing-campaign.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("admin_audit_log").select("reason").eq("id", params.id).eq("action", "marketing_campaign_send").maybeSingle();
    if (error || !data?.reason) return unavailable();
    try {
      const saved = JSON.parse(data.reason);
      if (Date.parse(saved.expiresAt) <= Date.now() || saved.tokenHash !== await hashCampaignToken(token)) return unavailable();
      return new Response(campaignHtml(saved.input), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'none'; style-src 'none'; frame-ancestors 'none'" } });
    } catch { return unavailable(); }
  } } },
});