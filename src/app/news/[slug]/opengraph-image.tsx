import { contentOpenGraphImage } from "@/lib/og-content-image";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Lalica Engineering Limited news article.";

export default contentOpenGraphImage(
  "news",
  "News",
  "Company updates from Lalica Engineering Limited.",
);
