/**
 * Company profile download.
 *
 * Serves the PDF only when the company has approved the profile for
 * public distribution (profile_download.enabled in settings). The file is
 * kept outside the public directory so it cannot be fetched by path
 * without this check.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { getSettingsCached } from "@/lib/settings/cache";

export const runtime = "nodejs";

export async function GET() {
  const profileDownload = await getSettingsCached("profile_download")();
  if (!profileDownload.enabled) {
    return new Response(null, { status: 404 });
  }

  try {
    const filePath = path.join(
      process.cwd(),
      "downloads",
      "lalica-company-profile.pdf",
    );
    const buffer = await readFile(filePath);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Lalica Company Profile.pdf"',
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
