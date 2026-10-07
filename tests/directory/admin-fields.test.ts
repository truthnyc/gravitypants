import { describe, expect, it } from "vitest";
import { z } from "zod";
import { brandPublicationFields, greetingEventInput } from "../../src/lib/directory/admin-fields";
describe("Admin publication and event validation", () => {
  it("accepts only draft or live publication", () => {
    const input = z.object(brandPublicationFields);
    expect(input.parse({ status: "draft", affiliated: true })).toEqual({ status: "draft", affiliated: true });
    expect(input.parse({ status: "live", affiliated: false })).toEqual({ status: "live", affiliated: false });
    expect(input.safeParse({ status: "published" }).success).toBe(false);
  });
  it("rejects arbitrary greeting actions and invalid sessions", () => {
    expect(greetingEventInput.safeParse({ session_id: "abc", rule: "weather", greeting: "Sunny", action: "shown" }).success).toBe(true);
    expect(greetingEventInput.safeParse({ session_id: "abc", rule: "weather", greeting: "Sunny", action: "delete" }).success).toBe(false);
    expect(greetingEventInput.safeParse({ session_id: "<script>", rule: "weather", greeting: "Sunny", action: "shown" }).success).toBe(false);
  });
});