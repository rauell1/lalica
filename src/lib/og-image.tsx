/**
 * Shared Open Graph image builder. Reads the extracted company logo from
 * the public assets and composes a branded 1200x630 preview card.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

let logoDataUrl: Promise<string> | null = null;

async function loadLogoDataUrl(): Promise<string> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "brand",
    "lalica-logo-white-background.jpg",
  );
  const buffer = await readFile(filePath);
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

export function getLogoDataUrl(): Promise<string> {
  if (!logoDataUrl) logoDataUrl = loadLogoDataUrl();
  return logoDataUrl;
}

export function OgFrame({
  title,
  subtitle,
  logoDataUrl,
}: {
  title: string;
  subtitle: string;
  logoDataUrl?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#050f28",
        padding: 56,
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        {logoDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoDataUrl}
            alt=""
            width={300}
            height={111}
            style={{
              backgroundColor: "white",
              borderRadius: 8,
              padding: "10px 14px",
              objectFit: "contain",
            }}
          />
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            width: 64,
            height: 8,
            backgroundColor: "#e58a18",
            borderRadius: 4,
            marginBottom: 24,
          }}
        />
        <div
          style={{
            fontSize: 54,
            fontWeight: 800,
            lineHeight: 1.15,
            maxWidth: 1000,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              marginTop: 20,
              fontSize: 28,
              color: "#b6c7ed",
              maxWidth: 950,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {subtitle}
          </div>
        )}
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
        <div style={{ fontSize: 22, color: "#e58a18", fontWeight: 700 }}>
          Engineering solutions for reliable operations
        </div>
      </div>
    </div>
  );
}
