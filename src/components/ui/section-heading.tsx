export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}) {
  const alignment = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <div className={`max-w-3xl ${alignment}`}>
      {eyebrow && (
        <p className="text-sm font-bold tracking-widest text-accent-600 uppercase">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base leading-7 text-ink-500 sm:text-lg">
          {subtitle}
        </p>
      )}
    </div>
  );
}
