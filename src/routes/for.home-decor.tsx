import { createFileRoute } from "@tanstack/react-router";
import { SearchPage, searchPageRoute } from "@/components/site/SearchPage";
import { searchPage } from "@/lib/site/search-pages";

const page = searchPage("/for/home-decor");

export const Route = createFileRoute("/for/home-decor")({
  ...searchPageRoute(page),
  component: PageComponent,
});

function PageComponent() {
  const { reels } = Route.useLoaderData();
  return <SearchPage page={page} reels={reels} />;
}
