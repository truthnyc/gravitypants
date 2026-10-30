import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      handler: (handler: unknown) => handler,
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

import { adminReplyToTicket } from "../src/lib/stillframe/admin.functions";

describe("support reply permissions", () => {
  it("rejects a signed-in non-admin before accessing the privileged client or sending", async () => {
    const rpc = vi.fn(async () => ({ data: false, error: null }));
    const handler = adminReplyToTicket as unknown as (input: unknown) => Promise<unknown>;
    await expect(handler({ context: { userId: "client", supabase: { rpc } }, data: {} })).rejects.toMatchObject({ status: 404 });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("is_platform_admin");
  });
});