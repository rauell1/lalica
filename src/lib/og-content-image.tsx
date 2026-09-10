import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { getPublishedBySlugCached } from "./content/cache";
import type { ContentType } from "./db";

let logoPromise: Promise<string> | null = null;

function loadLogoDataUrl(): Promise<string> {
  if (!logoPromise) {
    logoPromise = readFile(
      path.join(
        process.cwd(),
        "public",
        "brand",
        "lalica-logo-white-background.jpg",
      ),
    ).then((buffer) => `data:image/jpeg;base64,${buffer.toString("base64")}`);
  }
  return logoPromise;
}

export function contentOpenGraphImage(
  type: ContentType,
  fallbackTitle: string,
  fallbackSubtitle: string,
) {
  return async function OpenGraphImage({
    params,
  }: {
    params: Promise<{ slug: string }>;
  }) {
    const { slug } = await params;
    const row = await getPublishedBySlugCached(type, slug);
    const title = row?.title || fallbackTitle;
    const subtitle = row?.excerpt || fallbackSubtitle;
    const logoDataUrl = await loadLogoDataUrl();

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#051129",
            padding: 64,
            color: "#ffffff",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ display: "flex" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoDataUrl}
              alt="Lalica Engineering Limited"
              width={280}
              height={104}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 10,
                padding: "10px 16px",
                objectFit: "contain",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                width: 72,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#e58a18",
                marginBottom: 24,
              }}
            />
            <div
              style={{
                fontSize: 54,
                fontWeight: 800,
                lineHeight: 1.15,
                maxWidth: 1040,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {title}
            </div>
            <div
              style={{
                marginTop: 20,
                fontSize: 26,
                color: "#b6c7ed",
                maxWidth: 1000,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {subtitle}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div style={{ fontSize: 22, color: "#86a2de" }}>
              Lalica Engineering Limited
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#e58a18" }}>
              DSM Center, Kahawa West, Nairobi
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  };
}
