import { createFileRoute } from "@tanstack/react-router";
import { AccountTabs } from "@/components/billing/AccountTabs";
import { StatsPage } from "./stats";

export const Route = createFileRoute("/_authenticated/app/account_/stats")({
  head: () => ({
    meta: [
      { title: "Brand stats — Your account" },
      { name: "description", content: "Views, saves and website clicks for each of your brands and reels." },
      { property: "og:title", content: "Brand stats — Your account" },
      { property: "og:description", content: "See which reels and moods bring shoppers to your website." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <StatsPage tabs={<div className="mb-6"><AccountTabs /></div>} />,
});
