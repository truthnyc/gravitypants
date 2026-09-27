import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Ctx = { supabase: any; userId: string };

async function adminDb(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("is_platform_admin");
  if (error || data !== true) throw new Response("Not found", { status: 404 });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function log(db: any, admin: string, action: string, ws: string | null, target?: string | null, reason?: string | null) {
  await db.from("admin_audit_log").insert({ admin_user_id: admin, action, workspace_id: ws, target: target ?? null, reason: reason ?? null });
}

async function allUsers(db: any) {
  const out: { id: string; email: string; created_at: string; last_sign_in_at: string | null }[] = [];
  for (let page = 1; page < 50; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    for (const u of users) out.push({ id: u.id, email: u.email ?? "", created_at: u.created_at, last_sign_in_at: u.last_sign_in_at ?? null });
    if (users.length < 1000) break;
  }
  return out;
}

const monthStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
};

async function clientRows(db: any) {
  const [users, { data: ws }, { data: bills }, { data: plans }, { data: usage }, { data: projects }, { data: storage }, { data: members }] =
    await Promise.all([
      allUsers(db),
      db.from("workspaces").select("id, name, owner_id, created_at, suspended_at"),
      db.from("workspace_billing").select("*"),
      db.from("plans").select("*"),
      db.from("export_usage").select("workspace_id, created_at").gte("created_at", monthStart()),
      db.from("projects").select("workspace_id, updated_at").is("deleted_at", null).eq("is_template", false),
      db.rpc("admin_storage_by_workspace"),
      db.from("workspace_members").select("workspace_id, user_id"),
    ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  const billBy = new Map((bills ?? []).map((b: any) => [b.workspace_id, b]));
  return ((ws ?? []) as any[]).map((w) => {
    const b: any = billBy.get(w.id) ?? {};
    const owner = userById.get(w.owner_id);
    const mine = (projects ?? []).filter((p: any) => p.workspace_id === w.id);
    const lastSeen = [
      ...(members ?? []).filter((m: any) => m.workspace_id === w.id).map((m: any) => userById.get(m.user_id)?.last_sign_in_at),
      ...mine.map((p: any) => p.updated_at),
    ].filter(Boolean).sort().pop() ?? null;
    const comp = b.comp_plan && b.comp_until && new Date(b.comp_until) > new Date();
    const plan = comp ? b.comp_plan : b.plan ?? "none";
    const paying = !comp && plan !== "trial" && plan !== "none" && b.status !== "canceled";
    return {
      id: w.id as string,
      name: w.name as string,
      ownerEmail: owner?.email ?? "",
      plan: plan as string,
      comp: !!comp,
      compUntil: (b.comp_until ?? null) as string | null,
      status: (w.suspended_at ? "suspended" : b.status ?? "none") as string,
      suspended: !!w.suspended_at,
      trialEndsAt: (b.trial_ends_at ?? null) as string | null,
      renewsAt: (b.current_period_end ?? null) as string | null,
      cancelAtPeriodEnd: !!b.cancel_at_period_end,
      paying,
      priceCents: paying ? ((plans ?? []).find((p: any) => p.id === plan)?.amount_cents ?? 0) : 0,
      interval: (plans ?? []).find((p: any) => p.id === plan)?.interval ?? "month",
      exportsThisMonth: (usage ?? []).filter((u: any) => u.workspace_id === w.id).length,
      ads: mine.length,
      storageBytes: Number((storage ?? []).find((s: any) => s.workspace_id === w.id)?.bytes ?? 0),
      signedUp: (owner?.created_at ?? w.created_at) as string,
      lastActive: lastSeen as string | null,
      stripeCustomerId: (b.stripe_customer_id ?? null) as string | null,
      environment: (b.environment ?? "sandbox") as string,
    };
  });
}
export type AdminClient = Awaited<ReturnType<typeof clientRows>>[number];

export const checkAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context as any).supabase.rpc("is_platform_admin");
    return { admin: data === true };
  });

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as any);
    const clients = await clientRows(db);
    const users = await allUsers(db);
    const since30 = new Date(Date.now() - 30 * 864e5);
    const { data: usage } = await db.from("export_usage").select("created_at").gte("created_at", since30.toISOString());
    const now = Date.now();
    const in3 = now + 3 * 864e5;
    const days: { day: string; signups: number; exports: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 864e5).toISOString().slice(0, 10);
      days.push({
        day: d,
        signups: users.filter((u) => u.created_at.slice(0, 10) === d).length,
        exports: (usage ?? []).filter((u: any) => u.created_at.slice(0, 10) === d).length,
      });
    }
    const trials = clients.filter((c) => c.plan === "trial" && c.trialEndsAt && new Date(c.trialEndsAt).getTime() > now);
    const ending = trials.filter((c) => new Date(c.trialEndsAt!).getTime() <= in3);
    const mrr = clients.reduce((s, c) => s + (c.paying ? (c.interval === "year" ? c.priceCents / 12 : c.priceCents) : 0), 0);
    return {
      signups7: users.filter((u) => new Date(u.created_at).getTime() > now - 7 * 864e5).length,
      activeTrials: trials.length,
      paying: clients.filter((c) => c.paying).length,
      mrrCents: Math.round(mrr),
      exportsMonth: clients.reduce((s, c) => s + c.exportsThisMonth, 0),
      trialsEnding3: ending.length,
      days,
      trialsEnding: trials.sort((a, b) => a.trialEndsAt!.localeCompare(b.trialEndsAt!)).slice(0, 8),
      paymentProblems: clients.filter((c) => c.status === "past_due"),
    };
  });

export const adminClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => clientRows(await adminDb(context as any)));

export const adminClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as any as Ctx;
    const db = await adminDb(ctx);
    const client = (await clientRows(db)).find((c) => c.id === data.id);
    if (!client) throw new Response("Not found", { status: 404 });
    const users = await allUsers(db);
    const [{ data: mem }, { data: ads }, { data: usage }, { data: exps }, { data: sess }] = await Promise.all([
      db.from("workspace_members").select("user_id, role").eq("workspace_id", data.id),
      db.from("projects").select("id, name, primary_format, thumbnail_url, updated_at").eq("workspace_id", data.id).is("deleted_at", null).eq("is_template", false).order("updated_at", { ascending: false }),
      db.from("export_usage").select("created_at").eq("workspace_id", data.id),
      db.from("exports").select("*").eq("workspace_id", data.id).order("created_at", { ascending: false }).limit(10),
      db.from("support_sessions").select("expires_at").eq("workspace_id", data.id).eq("admin_user_id", ctx.userId).is("ended_at", null).gt("expires_at", new Date().toISOString()).maybeSingle(),
    ]);
    const byMonth: Record<string, number> = {};
    for (const u of usage ?? []) byMonth[u.created_at.slice(0, 7)] = (byMonth[u.created_at.slice(0, 7)] ?? 0) + 1;
    let invoices: { id: string; amount: number; status: string; created: number; url: string | null }[] = [];
    let next: { amount: number; date: number } | null = null;
    let stripeStatus: string | null = null;
    if (client.stripeCustomerId) {
      try {
        const { createStripeClient } = await import("@/lib/stripe.server");
        const stripe = createStripeClient(client.environment === "live" ? "live" : "sandbox");
        const list = await stripe.invoices.list({ customer: client.stripeCustomerId, limit: 6 });
        invoices = list.data.map((i) => ({ id: i.id ?? "", amount: i.amount_paid || i.amount_due, status: i.status ?? "", created: i.created, url: i.hosted_invoice_url ?? null }));
        const subs = await stripe.subscriptions.list({ customer: client.stripeCustomerId, limit: 1, status: "all" });
        stripeStatus = subs.data[0]?.status ?? null;
        try {
          const up = await stripe.invoices.createPreview({ customer: client.stripeCustomerId });
          next = { amount: up.amount_due, date: up.next_payment_attempt ?? up.period_end };
        } catch { /* no upcoming invoice */ }
      } catch (e) {
        console.error("stripe lookup failed", e);
      }
    }
    await log(db, ctx.userId, "view_client", data.id, client.name);
    return {
      client,
      members: (mem ?? []).map((m: any) => {
        const u = users.find((x) => x.id === m.user_id);
        return { userId: m.user_id as string, email: u?.email ?? "", role: m.role as string, lastSignIn: u?.last_sign_in_at ?? null };
      }),
      ads: (ads ?? []) as { id: string; name: string; primary_format: string; thumbnail_url: string | null; updated_at: string }[],
      exportsByMonth: Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12),
      recentExports: (exps ?? []) as any[],
      invoices,
      next,
      stripeStatus,
      supportUntil: (sess?.expires_at ?? null) as string | null,
    };
  });

export const adminLogOpen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as any as Ctx;
    const db = await adminDb(ctx);
    const { data: p } = await db.from("projects").select("workspace_id, name").eq("id", data.projectId).maybeSingle();
    if (p) await log(db, ctx.userId, "open_ad", p.workspace_id, `${p.name} (${data.projectId})`);
    const { data: s } = await db.from("support_sessions").select("expires_at").eq("workspace_id", p?.workspace_id ?? "").eq("admin_user_id", ctx.userId).is("ended_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
    return { supportUntil: (s?.expires_at ?? null) as string | null };
  });

const reason = z.string().trim().min(3).max(300);

export const adminSupport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), start: z.boolean(), reason: z.string().max(300).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as any as Ctx;
    const db = await adminDb(ctx);
    const now = new Date().toISOString();
    await db.from("support_sessions").update({ ended_at: now }).eq("workspace_id", data.id).eq("admin_user_id", ctx.userId).is("ended_at", null);
    if (data.start) {
      const r = reason.parse(data.reason ?? "");
      await db.from("support_sessions").insert({ admin_user_id: ctx.userId, workspace_id: data.id, reason: r });
      await log(db, ctx.userId, "support_start", data.id, null, r);
    } else await log(db, ctx.userId, "support_end", data.id);
    return { ok: true };
  });

async function removeTree(store: any, prefix: string) {
  const { data } = await store.list(prefix, { limit: 1000 });
  const files: string[] = [];
  for (const f of data ?? []) {
    const p = `${prefix}/${f.name}`;
    if (f.id) files.push(p);
    else await removeTree(store, p);
  }
  if (files.length) await store.remove(files);
}

export const adminAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      action: z.enum(["extend_trial", "comp_plan", "end_comp", "reset_exports", "suspend", "unsuspend", "delete"]),
      reason,
      days: z.number().int().min(1).max(365).optional(),
      plan: z.enum(["simple", "business"]).optional(),
      until: z.string().optional(),
      confirmName: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as any as Ctx;
    const db = await adminDb(ctx);
    const { data: w } = await db.from("workspaces").select("id, name").eq("id", data.id).maybeSingle();
    if (!w) throw new Error("Client not found");
    const { data: b } = await db.from("workspace_billing").select("*").eq("workspace_id", data.id).maybeSingle();
    let target = "";
    switch (data.action) {
      case "extend_trial": {
        const base = Math.max(Date.now(), b?.trial_ends_at ? new Date(b.trial_ends_at).getTime() : 0);
        const until = new Date(base + (data.days ?? 7) * 864e5).toISOString();
        await db.from("workspace_billing").update({ trial_ends_at: until }).eq("workspace_id", data.id);
        target = `+${data.days ?? 7} days → ${until.slice(0, 10)}`;
        break;
      }
      case "comp_plan": {
        if (!data.plan || !data.until || isNaN(Date.parse(data.until))) throw new Error("Pick a plan and an end date");
        await db.from("workspace_billing").update({ comp_plan: data.plan, comp_until: new Date(data.until).toISOString() }).eq("workspace_id", data.id);
        target = `${data.plan} until ${data.until.slice(0, 10)}`;
        break;
      }
      case "end_comp":
        await db.from("workspace_billing").update({ comp_plan: null, comp_until: null }).eq("workspace_id", data.id);
        break;
      case "reset_exports": {
        const since = b?.current_period_start ?? new Date(Date.now() - 31 * 864e5).toISOString();
        await db.from("export_usage").delete().eq("workspace_id", data.id).gte("created_at", since);
        break;
      }
      case "suspend":
        await db.from("workspaces").update({ suspended_at: new Date().toISOString() }).eq("id", data.id);
        break;
      case "unsuspend":
        await db.from("workspaces").update({ suspended_at: null }).eq("id", data.id);
        break;
      case "delete": {
        if (data.confirmName !== w.name) throw new Error("Type the workspace name exactly to delete it");
        if (b?.stripe_subscription_id) {
          try {
            const { createStripeClient } = await import("@/lib/stripe.server");
            await createStripeClient(b.environment === "live" ? "live" : "sandbox").subscriptions.cancel(b.stripe_subscription_id);
          } catch (e) {
            console.error("cancel failed", e);
          }
        }
        await removeTree(db.storage.from("media"), data.id);
        const { data: ps } = await db.from("projects").select("id").eq("workspace_id", data.id);
        const ids = (ps ?? []).map((p: any) => p.id);
        if (ids.length) await db.from("frames").delete().in("project_id", ids);
        for (const t of ["projects", "assets", "brand_kit", "export_usage", "exports", "workspace_billing", "support_sessions", "workspace_members"])
          await db.from(t).delete().eq("workspace_id", data.id);
        await db.from("workspaces").delete().eq("id", data.id);
        target = w.name;
        break;
      }
    }
    await log(db, ctx.userId, data.action, data.action === "delete" ? null : data.id, target || w.name, data.reason);
    return { ok: true };
  });

export const adminExports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as any);
    const [{ data: ex }, { data: ws }, { data: ps }] = await Promise.all([
      db.from("exports").select("*").order("created_at", { ascending: false }).limit(500),
      db.from("workspaces").select("id, name"),
      db.from("projects").select("id, name"),
    ]);
    return ((ex ?? []) as any[]).map((e) => ({
      id: e.id as string,
      workspaceId: e.workspace_id as string,
      client: (ws ?? []).find((w: any) => w.id === e.workspace_id)?.name ?? "Deleted",
      ad: (ps ?? []).find((p: any) => p.id === e.project_id)?.name ?? "Deleted ad",
      channels: e.channels as string[],
      formats: e.formats as string[],
      bytes: Number(e.total_bytes),
      status: e.status as string,
      error: e.error as string | null,
      created_at: e.created_at as string,
    }));
  });

export const adminAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as any);
    const users = await allUsers(db);
    const { data } = await db.from("profiles").select("user_id, display_name").eq("is_platform_admin", true);
    return ((data ?? []) as any[]).map((p) => {
      const u = users.find((x) => x.id === p.user_id);
      return { userId: p.user_id as string, email: u?.email ?? "", name: p.display_name as string | null, lastSignIn: u?.last_sign_in_at ?? null };
    });
  });

export const adminSetAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ email: z.string().email().optional(), userId: z.string().uuid().optional(), grant: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as any as Ctx;
    const db = await adminDb(ctx);
    const users = await allUsers(db);
    const u = data.userId ? users.find((x) => x.id === data.userId) : users.find((x) => x.email.toLowerCase() === data.email?.toLowerCase());
    if (!u) throw new Error("No account uses that email. They need to sign up first.");
    if (!data.grant) {
      const { count } = await db.from("profiles").select("user_id", { count: "exact", head: true }).eq("is_platform_admin", true);
      if ((count ?? 0) <= 1) throw new Error("You can't remove the last admin.");
    }
    await db.from("profiles").upsert({ user_id: u.id, is_platform_admin: data.grant }, { onConflict: "user_id" });
    await log(db, ctx.userId, data.grant ? "grant_admin" : "revoke_admin", null, u.email);
    return { ok: true };
  });

export const adminAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as any);
    const [users, { data: rows }, { data: ws }] = await Promise.all([
      allUsers(db),
      db.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(1000),
      db.from("workspaces").select("id, name"),
    ]);
    return ((rows ?? []) as any[]).map((r) => ({
      id: r.id as string,
      admin: users.find((u) => u.id === r.admin_user_id)?.email ?? "",
      action: r.action as string,
      workspaceId: r.workspace_id as string | null,
      client: (ws ?? []).find((w: any) => w.id === r.workspace_id)?.name ?? (r.workspace_id ? "Deleted" : ""),
      target: r.target as string | null,
      reason: r.reason as string | null,
      created_at: r.created_at as string,
    }));
  });
