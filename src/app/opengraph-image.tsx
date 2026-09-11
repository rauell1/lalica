import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Lalica Engineering Limited: engineering solutions for reliable operations.";

const TITLE = "Engineering solutions for reliable operations.";
const SUBTITLE =
  "Electrical, automation, mechanical, refrigeration, and HVAC solutions for commercial, industrial, and institutional clients.";

async function loadLogoDataUrl(): Promise<string> {
  const buffer = await readFile(
    path.join(
      process.cwd(),
      "public",
      "brand",
      "lalica-logo-white-background.jpg",
    ),
  );
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

export default async function OpenGraphImage() {
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
            width={320}
            height={118}
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
              marginBottom: 28,
            }}
          />
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              lineHeight: 1.15,
              maxWidth: 1000,
            }}
          >
            {TITLE}
          </div>
          <div style={{ marginTop: 24, fontSize: 28, color: "#b6c7ed", maxWidth: 950 }}>
            {SUBTITLE}
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
    { ...size },
  );
}
