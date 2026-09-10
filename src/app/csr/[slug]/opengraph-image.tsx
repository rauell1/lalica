import { contentOpenGraphImage } from "@/lib/og-content-image";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Lalica Engineering Limited CSR story.";

export default contentOpenGraphImage(
  "csr_story",
  "Corporate social responsibility",
  "CSR initiatives published with evidence notes and verified partners.",
);
