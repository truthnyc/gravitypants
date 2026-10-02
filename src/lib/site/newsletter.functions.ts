import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email().max(255),
  source: z.enum(["popup", "footer"]),
});

// Adds a subscriber to the Campaign Monitor list. Campaign Monitor sends the
// confirmation email (confirmed opt-in list or welcome journey).
export const subscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.CAMPAIGN_MONITOR_API_KEY;
    const listId = process.env.CAMPAIGN_MONITOR_LIST_ID;
    if (!apiKey || !listId) throw new Error("Subscriptions are not set up yet.");
    const res = await fetch(`https://api.createsend.com/api/v3.3/subscribers/${encodeURIComponent(listId)}.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${apiKey}:x`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        EmailAddress: data.email,
        Resubscribe: true,
        RestartSubscriptionBasedAutoresponders: true,
        ConsentToTrack: "Yes",
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Campaign Monitor subscribe failed [${res.status}]: ${body}`);
      throw new Error("We couldn't sign you up. Please try again.");
    }
    return { ok: true };
  });
