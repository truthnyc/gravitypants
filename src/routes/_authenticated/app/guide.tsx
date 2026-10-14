import { createFileRoute } from "@tanstack/react-router";
import { GuidePage } from "@/components/guide/GuidePage";

export const Route = createFileRoute("/_authenticated/app/guide")({
  head: () => ({ meta: [
    { title: "Getting started with Gravity Pants" },
    { name: "description", content: "Your guide to making a first reel, editing, brand kits, templates, exports and team settings in Gravity Pants." },
    { property: "og:title", content: "Getting started with Gravity Pants" },
    { property: "og:description", content: "A practical guide to creating, editing and exporting your reels with Gravity Pants." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: GuidePage,
});
