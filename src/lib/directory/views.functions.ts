import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const openSchema = z.object({ eventId: z.string().uuid(), reelId: z.string().uuid(), kind: z.enum(["directory", "site"]) });

/** Only aggregate counts leave the server; the SQL helper restricts them to visible reels. */
export const getDirectoryWeeklyViews = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ ids: z.array(z.string().uuid()).max(240) }).parse(data))
  .handler(async ({ data }): Promise<Record<string, number>> => {
    if (!data.ids.length) return {};
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("directory_reel_weekly_views", { _ids: data.ids });
    if (error) throw new Error("Couldn't load weekly reel views");
    return Object.fromEntries((rows ?? []).map((row) => [`${row.kind}:${row.reel_id}`, Number(row.views)]));
  });

/** Deliberately public analytics action: SQL verifies publication and derives workspace/time. */
export const recordDirectoryReelOpen = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => openSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: recorded, error } = await supabaseAdmin.rpc("record_directory_reel_open", {
      _event_id: data.eventId, _reel_id: data.reelId, _kind: data.kind,
    });
    if (error) throw new Error("Couldn't record reel open");
    return { recorded: recorded === true };
  });