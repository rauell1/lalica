export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  id,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  id?: string;
}) {
  const centered = align === "center";
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow && (
        <p className="text-sm font-bold tracking-wider text-accent-600 uppercase">
          {eyebrow}
        </p>
      )}
      <h2
        id={id}
        className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl"
      >
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-lg leading-8 text-ink-500">{subtitle}</p>
      )}
    </div>
  );
}
