import { createFileRoute } from "@tanstack/react-router";
import { SearchPage, searchPageRoute } from "@/components/site/SearchPage";
import { searchPage } from "@/lib/site/search-pages";

const page = searchPage("/video-ads-for-small-business");

export const Route = createFileRoute("/video-ads-for-small-business")({
  ...searchPageRoute(page),
  component: PageComponent,
});

function PageComponent() {
  const { reels } = Route.useLoaderData();
  return <SearchPage page={page} reels={reels} />;
}
