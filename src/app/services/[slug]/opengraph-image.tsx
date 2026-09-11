import { contentOpenGraphImage } from "@/lib/og-content-image";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Lalica Engineering Limited service page.";

export default contentOpenGraphImage(
  "service",
  "Engineering services",
  "Electrical, automation, mechanical, refrigeration, and HVAC solutions from Lalica Engineering Limited.",
);
