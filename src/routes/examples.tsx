import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/examples")({
  head: () => ({ meta: [
    { title: "Examples — Gravity Pants" },
    { name: "description", content: "See examples of video ads and GIFs made with Gravity Pants." },
    { property: "og:title", content: "Examples — Gravity Pants" },
    { property: "og:description", content: "Explore Gravity Pants video ad examples." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <SiteShell><div aria-label="Examples" /></SiteShell>,
});