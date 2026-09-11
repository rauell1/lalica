import { countPublishedCached, listPublishedCached } from "@/lib/content/cache";
import { buildPageMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { ArticleCard } from "@/components/public/article-card";
import { EmptyCollection } from "@/components/public/empty-collection";
import { CtaBanner } from "@/components/public/cta-banner";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const count = await countPublishedCached("project");
  return buildPageMetadata({
    title: "Projects",
    description:
      "Selected projects delivered by Lalica Engineering Limited. Project pages publish sector, location, and outcomes only when they are documented.",
    path: "/projects",
    noIndex: count === 0,
  });
}

export default async function ProjectsPage() {
  const [projects, count] = await Promise.all([
    listPublishedCached("project"),
    countPublishedCached("project"),
  ]);

  return (
    <>
      <section className="border-b border-ink-100 bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Projects", path: "/projects" },
            ]}
          />
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
            Projects
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-ink-500">
            Selected work from {count === 0 ? "the team" : "our recent work"}.
            Each project page publishes what can be documented: the sector,
            the location, the work done, and the outcomes.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {projects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ArticleCard
                key={project.id}
                href={`/projects/${project.slug}`}
                title={project.title}
                excerpt={project.excerpt}
                metaLabel={(project.metadata as { sector?: string } | null)?.sector}
              />
            ))}
          </div>
        ) : (
          <EmptyCollection
            title="Project pages are on the way"
            body="We only publish project pages once the details are documented and
            confirmed. Check back soon, or contact us to discuss the kind of
            work you are planning."
          />
        )}
      </section>

      <CtaBanner
        title="Have a project in mind?"
        body="Tell us about your requirement and we will scope it with you before quoting."
      />
    </>
  );
}
