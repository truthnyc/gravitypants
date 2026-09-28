import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Gravity Pants — Photos in. Reels out." },
    { name: "description", content: "Gravity Pants turns still photos into short video ads and animated GIFs for social." },
    { property: "og:title", content: "Gravity Pants — Photos in. Reels out." },
    { property: "og:description", content: "Turn still photos into short video ads and animated GIFs." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <SiteShell><div aria-label="Home" /></SiteShell>,
});