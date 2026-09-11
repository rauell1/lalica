import { countPublishedCached, listPublishedCached } from "@/lib/content/cache";
import { buildPageMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { ArticleCard } from "@/components/public/article-card";
import { EmptyCollection } from "@/components/public/empty-collection";
import { CtaBanner } from "@/components/public/cta-banner";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const count = await countPublishedCached("news");
  return buildPageMetadata({
    title: "News",
    description:
      "Company updates and news from Lalica Engineering Limited.",
    path: "/news",
    noIndex: count === 0,
  });
}

export default async function NewsIndexPage() {
  const [articles, count] = await Promise.all([
    listPublishedCached("news"),
    countPublishedCached("news"),
  ]);

  return (
    <>
      <section className="border-b border-ink-100 bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "News", path: "/news" },
            ]}
          />
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
            News
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-ink-500">
            Updates from {count === 0 ? "the company" : "Lalica Engineering Limited"}.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {articles.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                href={`/news/${article.slug}`}
                title={article.title}
                excerpt={article.excerpt}
                dateLabel={
                  article.publishedAt
                    ? article.publishedAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })
                    : undefined
                }
                metaLabel={
                  (article.metadata as { category?: string } | null)?.category
                }
              />
            ))}
          </div>
        ) : (
          <EmptyCollection
            title="No news yet"
            body="The news section opens once the company publishes its first
            updates. Check back soon, or contact us directly."
          />
        )}
      </section>

      <CtaBanner
        title="Talk to our team"
        body="Tell us about your facility, plant, or project. We will get back to you to discuss the best way forward."
      />
    </>
  );
}
