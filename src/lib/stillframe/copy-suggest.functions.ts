import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Signed-in: suggest three headline or subline options for one frame. Access is checked by reading the ad and photo through RLS. */
export const suggestFrameCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    projectId: z.string().uuid(),
    part: z.enum(["headline", "subline"]),
    brand: z.string().trim().max(120),
    format: z.string().trim().max(40),
    photoPath: z.string().trim().max(500).nullable(),
    headline: z.string().trim().max(300).optional(),
    current: z.string().trim().max(300).optional(),
    others: z.array(z.string().trim().max(300)).max(20).default([]),
    hint: z.string().trim().max(200).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: project } = await context.supabase.from("projects").select("id").eq("id", data.projectId).maybeSingle();
    if (!project) throw new Error("Not authorized");
    let imageUrl: string | null = null;
    if (data.photoPath && !data.photoPath.startsWith("brand-assets:")) {
      const { data: signed } = await context.supabase.storage.from("media").createSignedUrl(data.photoPath, 600);
      imageUrl = signed?.signedUrl ?? null;
    }
    const { writeCopy } = await import("./copy-suggest.server");
    try {
      return { options: await writeCopy({ ...data, imageUrl }) };
    } catch {
      return { options: [] as string[], error: "Couldn't write suggestions right now. Please try again." };
    }
  });
