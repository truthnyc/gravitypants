import { createFileRoute } from "@tanstack/react-router";
import { NewAdFormatStep } from "@/components/editor/FormatStep";

export const Route = createFileRoute("/_authenticated/app/new")({
  head: () => ({
    meta: [
      { title: "New ad — Gravity Pants" },
      { name: "description", content: "Pick the main size, a template and a brand kit for your new ad." },
      { property: "og:title", content: "New ad — Gravity Pants" },
      { property: "og:description", content: "Pick the main size, a template and a brand kit for your new ad." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewAdFormatStep,
});
