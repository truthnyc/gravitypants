import { createFileRoute } from "@tanstack/react-router";
import { StageView } from "@/components/directory/StageView";
import { getStage } from "@/lib/directory/stage.functions";
import { stageSearch, stageCategories } from "@/lib/directory/stage";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const Route = createFileRoute("/stage/$mood")({
  validateSearch: stageSearch,
  loaderDeps: ({ search }) => ({ categories: search.categories, seed: search.seed }),
  loader: ({ deps, params }) => getStage({ data: { mood: params.mood.toLowerCase().slice(0, 60), categories: stageCategories(deps.categories), seed: deps.seed ?? "" } }),
  head: ({ params }) => ({
    meta: [
      { title: `Stage view: ${cap(params.mood)} reels | Aimanté` },
      { name: "description", content: `Watch ${params.mood} brand reels on Aimanté, large and one at a time.` },
      { property: "og:title", content: `${cap(params.mood)} reels, one at a time | Aimanté` },
      { property: "og:description", content: `Watch ${params.mood} brand reels on Aimanté, large and one at a time.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: Page,
});

function Page() {
  const data = Route.useLoaderData();
  const { mood } = Route.useParams();
  const s = Route.useSearch();
  return <StageView mood={mood.toLowerCase()} categories={stageCategories(s.categories)} start={s.start ?? null} data={data} />;
}
