import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/features")({
  head: () => ({ meta: [
    { title: "Features — Gravity Pants" },
    { name: "description", content: "Explore Gravity Pants features for making short video ads from photos." },
    { property: "og:title", content: "Features — Gravity Pants" },
    { property: "og:description", content: "Make short video ads from photos with Gravity Pants." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <SiteShell><div aria-label="Features" /></SiteShell>,
});