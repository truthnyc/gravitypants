import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ServiceUnavailable } from "@/components/site/ServiceUnavailable";
import { StageView } from "@/components/directory/StageView";
import { getStage } from "@/lib/directory/stage.functions";
import { stageSearch, stageCategories } from "@/lib/directory/stage";

export const Route = createFileRoute("/stage/")({
  validateSearch: stageSearch,
  loaderDeps: ({ search }) => ({ categories: search.categories, seed: search.seed }),
  loader: ({ deps }) => getStage({ data: { mood: null, categories: stageCategories(deps.categories), seed: deps.seed ?? "" } }),
  head: () => ({
    meta: [
      { title: "Stage view: every reel, one at a time | Aimanté" },
      { name: "description", content: "Watch Aimanté brand reels large, one after another." },
      { property: "og:title", content: "Stage view | Aimanté" },
      { property: "og:description", content: "Watch Aimanté brand reels large, one after another." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: Page,
  errorComponent: StageError,
});

function Page() {
  const data = Route.useLoaderData();
  const s = Route.useSearch();
  return <StageView mood={null} categories={stageCategories(s.categories)} start={s.start ?? null} data={data} />;
}

function StageError() {
  const router = useRouter();
  return <ServiceUnavailable onRetry={() => router.invalidate()} />;
}
