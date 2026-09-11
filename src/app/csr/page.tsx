import { countPublishedCached, listPublishedCached } from "@/lib/content/cache";
import { buildPageMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { ArticleCard } from "@/components/public/article-card";
import { EmptyCollection } from "@/components/public/empty-collection";
import { CtaBanner } from "@/components/public/cta-banner";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const count = await countPublishedCached("csr_story");
  return buildPageMetadata({
    title: "Corporate social responsibility",
    description:
      "CSR initiatives Lalica Engineering Limited takes part in, published with evidence notes, verified partners, and related Sustainable Development Goals.",
    path: "/csr",
    noIndex: count === 0,
  });
}

export default async function CsrIndexPage() {
  const [stories, count] = await Promise.all([
    listPublishedCached("csr_story"),
    countPublishedCached("csr_story"),
  ]);

  return (
    <>
      <section className="border-b border-ink-100 bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "CSR", path: "/csr" },
            ]}
          />
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
            Corporate social responsibility
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-ink-500">
            We publish CSR stories only when they can be documented. Every
            story states its date, location, verified partners, and the
            evidence behind each impact measure.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {stories.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => {
              const metadata = story.metadata as { theme?: string; initiativeDate?: string } | null;
              return (
                <ArticleCard
                  key={story.id}
                  href={`/csr/${story.slug}`}
                  title={story.title}
                  excerpt={story.excerpt}
                  metaLabel={metadata?.theme}
                  dateLabel={metadata?.initiativeDate || undefined}
                />
              );
            })}
          </div>
        ) : (
          <EmptyCollection
            title="CSR stories will appear here"
            body="We only publish activities we can evidence, with partners that
            have confirmed their participation. Check back soon, or contact
            us if you would like to partner on a community initiative."
          />
        )}
      </section>

      <CtaBanner
        title="Partner with us on a community initiative"
        body="Tell us about your initiative and how engineering skills could help."
      />
    </>
  );
}
